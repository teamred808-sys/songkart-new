DELETE FROM chat_response_cache 
WHERE response LIKE '%having trouble answering%' 
   OR response LIKE '%temporarily unavailable%'
   OR response LIKE '%couldn''t generate a response%';