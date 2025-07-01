
-- 모국어 값을 영어로 표준화
UPDATE students 
SET mother_tongue = CASE 
    WHEN mother_tongue IN ('한국어', 'Korean') THEN 'Korean'
    WHEN mother_tongue IN ('중국어', 'Chinese') THEN 'Chinese' 
    WHEN mother_tongue IN ('러시아어', 'Russian') THEN 'Russian'
    WHEN mother_tongue IN ('영어', 'English') THEN 'English'
    WHEN mother_tongue IN ('일본어', 'Japanese') THEN 'Japanese'
    ELSE mother_tongue
END;
