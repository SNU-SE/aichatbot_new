import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ProcessActivityDocumentRequest {
  activityId: string;
  storagePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  assignedClasses?: string[];
  chunkingConfig?: ChunkingConfig;
  grantedBy?: string;
  title?: string;
  bucket?: string;
}

interface ChunkingConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  chunkOverlap?: number;
  preserveParagraphs?: boolean;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

const ACTIVITY_FILES_BUCKET = Deno.env.get("ACTIVITY_FILES_BUCKET") ?? "activity-files";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Authorization header required" });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userResult, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !userResult?.user) {
      return jsonResponse(401, { error: "Invalid or expired token", details: authError });
    }

    const body = await req.json() as ProcessActivityDocumentRequest;
    const validationError = validateRequest(body);
    if (validationError) {
      return jsonResponse(400, { error: validationError });
    }

    const bucket = body.bucket ?? ACTIVITY_FILES_BUCKET;
    const storagePath = sanitizePath(body.storagePath);
    const fileName = body.fileName || storagePath.split("/").pop() || "document.pdf";
    const mimeType = body.mimeType ?? "application/pdf";
    const fileSize = body.fileSize;

    if (!fileSize || Number.isNaN(fileSize) || fileSize <= 0) {
      return jsonResponse(400, { error: "fileSize must be provided and greater than zero" });
    }

    const signedUrlResult = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 15);

    if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
      return jsonResponse(400, {
        error: "Unable to access uploaded file",
        details: signedUrlResult.error
      });
    }

    const signedUrl = signedUrlResult.data.signedUrl;

    const title = body.title ?? deriveTitle(fileName);
    const metadata = {
      source: "activity-upload",
      activityId: body.activityId,
      assignedClasses: body.assignedClasses ?? null,
      originalFileName: fileName,
      uploadedBy: userResult.user.id,
      uploadedAt: new Date().toISOString(),
      bucket,
      storagePath
    };

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: userResult.user.id,
        title,
        filename: fileName,
        file_path: `${bucket}/${storagePath}`,
        file_size: fileSize,
        mime_type: mimeType,
        processing_status: "uploading",
        metadata
      })
      .select()
      .single();

    if (documentError || !document) {
      return jsonResponse(500, { error: "Failed to create document record", details: documentError });
    }

    const { error: linkError } = await supabase.rpc("upsert_activity_document_link", {
      p_activity_id: body.activityId,
      p_document_id: document.id,
      p_processing_status: "uploading"
    });

    if (linkError) {
      return jsonResponse(500, { error: "Failed to link document to activity", details: linkError });
    }

    const { error: permissionError } = await supabase.rpc("sync_activity_document_permissions", {
      p_activity_id: body.activityId,
      p_granted_by: body.grantedBy ?? userResult.user.id
    });

    if (permissionError) {
      console.error("Permission sync error", permissionError);
    }

    const { error: statusError } = await supabase.rpc("upsert_activity_document_link", {
      p_activity_id: body.activityId,
      p_document_id: document.id,
      p_processing_status: "extracting"
    });

    if (statusError) {
      console.error("Failed to update activity document status", statusError);
    }

    const processorPayload: Record<string, unknown> = {
      documentId: document.id,
      fileUrl: signedUrl,
      userId: userResult.user.id,
      activityId: body.activityId
    };

    if (body.chunkingConfig) {
      processorPayload.chunkingConfig = body.chunkingConfig;
    }

    const { data: processorData, error: processorError } = await supabase.functions.invoke(
      "enhanced-document-processor",
      { body: processorPayload }
    );

    if (processorError || !processorData?.success) {
      await supabase.rpc("upsert_activity_document_link", {
        p_activity_id: body.activityId,
        p_document_id: document.id,
        p_processing_status: "failed",
        p_processing_error: processorError?.message ?? processorData?.error ?? "Processing failed"
      });

      return jsonResponse(500, {
        error: "Document processing failed",
        details: processorError ?? processorData?.error
      });
    }

    return jsonResponse(200, {
      documentId: document.id,
      activityId: body.activityId,
      processing: processorData,
      filePath: `${bucket}/${storagePath}`
    });
  } catch (error) {
    console.error("process-activity-document error", error);
    return jsonResponse(500, {
      error: "Unexpected error during activity document processing",
      details: error instanceof Error ? error.message : error
    });
  }
});

function jsonResponse(status: number, body: ErrorResponse | Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function validateRequest(body: ProcessActivityDocumentRequest): string | null {
  if (!body) return "Request body is required";
  if (!body.activityId) return "activityId is required";
  if (!body.storagePath) return "storagePath is required";
  if (!body.fileName) return "fileName is required";
  return null;
}

function deriveTitle(fileName: string): string {
  if (!fileName.includes(".")) return fileName;
  return fileName.replace(/\.[^/.]+$/, "");
}

function sanitizePath(path: string): string {
  return path.replace(/^\/+/, "");
}
