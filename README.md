### Running

- From repo directory, run `npx http-server`
- Open "localhost:8080/lib" for development.
- For production, "pnpm install && pnpm build"
- Open "localhost:8080/dist" for production.

### Setup

- I've created [a fine-grained token][new-token] with `repo` scope for this repo.

![GitHub Token](docs/github_token.png)

- I've added that token as `GITHUB_TOKEN` in AWS Secrets Manager.
- I've created an AWS Lambda function with a WebSocket API Gateway.
- In API Gateway, I use a "route key" to route each Websocket message.
- I enabled two-way communication

![Route Key](docs/route_key.png)

- I added an AWS Lambda extension to allow AWS Parameters and Secrets

![Secrets](docs/lambda_secrets.png)

- I added the follolwing permissions to my lambda execution role: 

```
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": [
				"secretsmanager:GetRandomPassword",
				"secretsmanager:*",
				"secretsmanager:ListSecrets",
				"secretsmanager:BatchGetSecretValue",
				"execute-api:*"
			],
			"Resource": "*"
		},
		{
			"Sid": "VisualEditor1",
			"Effect": "Allow",
			"Action": [
				"secretsmanager:GetSecretValue",
				"secretsmanager:*"
			],
			"Resource": "arn:aws:secretsmanager:us-east-1:111122223333:secret:SECRET_NAME"
		},
		{
			"Sid": "VisualEditor2",
			"Effect": "Allow",
			"Action": "secretsmanager:*",
			"Resource": "arn:aws:secretsmanager:us-east-1:111122223333:secret:SECRET_NAME"
		},
		{
			"Sid": "Statement1",
			"Effect": "Allow",
			"Action": [
				"execute-api:*"
			],
			"Resource": [
				"*"
			]
		},
		{
			"Sid": "Statement2",
			"Effect": "Allow",
			"Action": [
				"secretsmanager:*"
			],
			"Resource": [
				"*"
			]
		}
	]
}
```

[new-env]: https://github.com/tvquizphd/101.boston/settings/environments/new
[new-token]: https://github.com/settings/personal-access-tokens/new
