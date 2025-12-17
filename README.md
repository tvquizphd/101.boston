### Setup

- I've created [a GitHub environment][new-env] named `TEST`
- I've created [a fine-grained token][new-token] with `repo` scope for this repo.

![GitHub Token](docs/github_token.png)


- I've created an AWS Lambda function with a WebSocket API Gateway.
- I set up the "route key" to be taken from Websocket message

![Route Key](docs/route_key.png)

- I added an AWS Lambda extension to allow AWS Parameters and Secrets

![Secrets](docs/lambda_secrets.png)

[new-env]: https://github.com/tvquizphd/101.boston/settings/environments/new
[new-token]: https://github.com/settings/personal-access-tokens/new
