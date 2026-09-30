#!/bin/sh
set -eu
awslocal s3 mb s3://lucid-files || true
awslocal s3api put-bucket-cors --bucket lucid-files --cors-configuration '{"CORSRules":[{"AllowedOrigins":["http://localhost:5173","http://localhost:3000"],"AllowedMethods":["POST","GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}'
