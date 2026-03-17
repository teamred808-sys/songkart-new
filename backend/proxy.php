<?php
$backend_url = 'http://127.0.0.1:5001' . $_SERVER['REQUEST_URI'];
$ch = curl_init($backend_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);

$headers = [];
$content_type = '';
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'connection' && strtolower($name) !== 'content-length') {
        if (strtolower($name) === 'content-type') {
            $content_type = $value;
            if (strpos($value, 'multipart/form-data') !== false) {
                continue;
            }
        }
        $headers[] = $name . ': ' . $value;
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    if (strpos($content_type, 'multipart/form-data') !== false) {
        $post_data = [];
        foreach ($_POST as $key => $value) {
            $post_data[$key] = $value;
        }
        foreach ($_FILES as $key => $file) {
            if (is_array($file['tmp_name'])) {
                foreach ($file['tmp_name'] as $i => $tmp_name) {
                    if ($file['error'][$i] === UPLOAD_ERR_OK) {
                        $post_data[$key . '[' . $i . ']'] = new CURLFile($tmp_name, $file['type'][$i], $file['name'][$i]);
                    }
                }
            } else {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    $post_data[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
                }
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(502);
    echo json_encode(['error' => 'Bad Gateway: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $header_size);
$body = substr($response, $header_size);

curl_close($ch);
http_response_code($http_code);

foreach (explode("\r\n", $header) as $h) {
    if (!empty($h) && !preg_match('/^Transfer-Encoding:/i', $h)) {
        header($h);
    }
}

echo $body;
