-- Test inserting into support_messages table
INSERT INTO support_messages (
    user_id,
    message_text,
    is_from_user,
    status
) VALUES (
    auth.uid(),
    'Test message from fix verification',
    true,
    'pending'
) RETURNING id, message_text, created_at;
