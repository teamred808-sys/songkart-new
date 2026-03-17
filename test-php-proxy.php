<?php
// Simple script to test upload handling
$ch = curl_init('http://127.0.0.1:5001/api/storage/song-covers/upload');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// Test POST directly
$post = [
    'file' => new CURLFile('/Volumes/SSD/github/songkart/test-cover.txt', 'text/plain', 'test-cover.txt'),
    'path' => 'test/test-cover.txt'
];
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$response = curl_exec($ch);
echo "Response: $response\n";
echo "Error: " . curl_error($ch) . "\n";
echo "HTTP Code: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "\n";
