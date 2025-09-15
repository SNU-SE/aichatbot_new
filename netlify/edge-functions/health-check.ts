/**
 * Netlify Edge Function for Health Checks
 * Provides system health status and basic monitoring
 */

import type { Context } from "https://edge.netlify.com";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    netlify: 'healthy' | 'degraded' | 'unhealthy';
    deployment: 'healthy' | 'degraded' | 'unhealthy';
  };
  performance: {
    responseTime: number;
    memoryUsage?: number;
  };
}

const startTime = Date.now();

export default async (request: Request, context: Context): Promise<Response> => {
  const requestStart = Date.now();
  
  try {
    // Basic health check
    const uptime = Date.now() - startTime;
    const responseTime = Date.now() - requestStart;
    
    // Check deployment status
    const deploymentStatus = await checkDeploymentHealth(context);
    
    // Determine overall health
    const services = {
      netlify: 'healthy' as const,
      deployment: deploymentStatus
    };
    
    const overallStatus = Object.values(services).includes('unhealthy') 
      ? 'unhealthy' 
      : Object.values(services).includes('degraded') 
        ? 'degraded' 
        : 'healthy';
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: Deno.env.get('NETLIFY_BUILD_VERSION') || '1.0.0',
      environment: context.site.name || 'unknown',
      services,
      performance: {
        responseTime,
        memoryUsage: getMemoryUsage()
      }
    };
    
    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return new Response(JSON.stringify(healthStatus, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: 'unknown',
      environment: 'unknown',
      services: {
        netlify: 'unhealthy',
        deployment: 'unhealthy'
      },
      performance: {
        responseTime: Date.now() - requestStart
      }
    };
    
    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function checkDeploymentHealth(context: Context): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    // Check if we can access basic deployment information
    const siteInfo = context.site;
    
    if (!siteInfo || !siteInfo.name) {
      return 'degraded';
    }
    
    // Additional checks could include:
    // - Database connectivity
    // - External service availability
    // - File system access
    
    return 'healthy';
  } catch (error) {
    console.error('Deployment health check failed:', error);
    return 'unhealthy';
  }
}

function getMemoryUsage(): number | undefined {
  try {
    // Deno memory usage (if available)
    if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
      const usage = Deno.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024); // MB
    }
  } catch (error) {
    console.warn('Could not get memory usage:', error);
  }
  return undefined;
}

export const config = {
  path: "/api/health"
};