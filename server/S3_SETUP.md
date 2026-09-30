# Product image uploads

The browser uploads product images directly to S3 using a short-lived presigned POST created by the API. AWS credentials stay on the server. The policy restricts uploads to the server-built tenant/product key, the declared image content type, and the configured maximum image size. The API verifies the uploaded object's size, type, and image signature before linking it to the product.

## Configuration

Set these values for the API:

- `S3__Bucket`: bucket name.
- `S3__Region`: bucket region.
- `S3__AccessKey` and `S3__SecretKey`: optional local credentials. In AWS, prefer an IAM role for the API.
- `S3__Endpoint`: optional S3-compatible endpoint for server-side metadata checks.
- `S3__PublicEndpoint`: optional browser-reachable endpoint used to sign local S3-compatible uploads.
- `S3__MaxImageBytes`: optional limit; defaults to 2 MiB.

The API role needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for `arn:aws:s3:::<bucket>/orgs/*`. The browser does not receive AWS credentials.

## Bucket CORS

Configure the bucket to allow `POST`, `GET`, and `HEAD` from the deployed web origin. For local development, the Compose LocalStack startup script sets CORS for `http://localhost:5173`. For AWS, apply and adjust [s3-cors.json](scripts/s3-cors.json), replacing the origin with the deployed web URL.

With Compose, LocalStack uses `http://localstack:4566` internally and `http://localhost:4566` for URLs opened by the browser.
