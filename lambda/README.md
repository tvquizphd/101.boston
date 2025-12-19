This assumes completion of some variant of the README.md in "101.boston/setup".

### For AWS

In "101.boston/lambda", run:

```
npm install .
npm run zip
```

In "101.boston/lambda/setup", run:

```
mkdir artifacts
aws iam create-role --role-name 101BostonRole --assume-role-policy-document file://secret-trust-policy.json --tags "Key=Project,Value=101.boston" > artifacts/secret-role.json
aws iam attach-role-policy --role-name 101BostonRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name 101BostonRole --policy-name LambdaServicePermissions --policy-document file://secret-inline-policy.json

jq --arg role "$(jq -r .Role.Arn artifacts/secret-role.json)" '.Role |= $role' secret-lambda-config.json > temp.json
aws lambda create-function --region us-east-2 --cli-input-json file://temp.json --tags "Key=Project,Value=101.boston" --zip-file fileb://secret-lambda.zip > artifacts/secret-lambda.json
```

In "101.boston/lambda/setup", run:

```
aws iam create-role --region us-east-2 --role-name 101BostonAPIRole --assume-role-policy-document file://secret-trust-policy.json --tags "Key=Project,Value=101.boston" > artifacts/secret-api-role.json

secretapirole=$(jq -r .FunctionArn artifacts/secret-lambda.json)
aws apigatewayv2 create-api --region us-east-2 --name "secret-websocket" --protocol-type WEBSOCKET --route-selection-expression '$request.body.k' --credentials-arn $secretapirole > artifacts/secret-api.json

secretapiid=$(jq -r .ApiId artifacts/secret-api.json)
lambda=$(jq -r .FunctionArn artifacts/secret-lambda.json)
aws apigatewayv2 create-integration --api-id $secretapiid --integration-type AWS_PROXY --integration-method POST --integration-uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/$lambda/invocations > artifacts/secret-integration.json

secretintegrationid=$(jq -r .IntegrationId artifacts/secret-integration.json)
aws apigatewayv2 create-route --region us-east-2 --region us-east-2 --api-id $secretapiid --route-key 'client_auth_data' --authorization-type NONE --target "integrations/$secretintegrationid" > artifacts/client_auth_data.json
aws apigatewayv2 create-route --region us-east-2 --region us-east-2 --api-id $secretapiid --route-key '$connect' --authorization-type NONE --target "integrations/$secretintegrationid" > artifacts/connect.json
aws apigatewayv2 create-route --region us-east-2 --region us-east-2 --api-id $secretapiid --route-key '$disconnect' --authorization-type NONE --target "integrations/$secretintegrationid" > artifacts/disconnect.json

clientauthdatarouteid=$(jq -r .RouteId artifacts/client_auth_data.json)
aws apigatewayv2 create-route-response --region us-east-2 --api-id $secretapiid --route-id $clientauthdatarouteid --route-response-key '$default' > artifacts/client_auth_data-response.json

lambdaname=$(jq -r .FunctionName artifacts/secret-lambda.json)
accountid=$(aws sts get-caller-identity | jq -r '.Account')
aws lambda add-permission --function-name $lambdaname --statement-id "client_auth_data" --action "lambda:InvokeFunction" --principal "apigateway.amazonaws.com" --source-arn "arn:aws:execute-api:us-east-2:$accountid:$secretapiid/*/client_auth_data"
aws lambda add-permission --function-name $lambdaname --statement-id "connect" --action "lambda:InvokeFunction" --principal "apigateway.amazonaws.com" --source-arn "arn:aws:execute-api:us-east-2:$accountid:$secretapiid/*/\$connect"
aws lambda add-permission --function-name $lambdaname --statement-id "disconnect" --action "lambda:InvokeFunction" --principal "apigateway.amazonaws.com" --source-arn "arn:aws:execute-api:us-east-2:$accountid:$secretapiid/*/\$disconnect"

aws apigatewayv2 create-stage --region us-east-2 --auto-deploy --api-id $secretapiid --stage-name dev > artifacts/secret-stage.json
aws apigatewayv2 create-deployment --region us-east-2 --api-id $secretapiid --stage-name dev > artifacts/secret-deployment.json

aws logs create-log-group --log-group-name "/aws/lambda/101-boston-log-group" --region us-east-2 
aws logs put-retention-policy --log-group-name "/aws/lambda/101-boston-log-group" --retention-in-days 7 --region us-east-2
aws lambda update-function-configuration --function-name "$lambdaname" --logging-config LogGroup=/aws/lambda/101-boston-log-group --region us-east-2

echo wss://$secretapiid.execute-api.us-east-2.amazonaws.com/dev
```

You should see a url be printed. To update the client, copy the url to:

- The `ws_url` attribute of `page-root` in "101.boston/index.html"
- The `ws_url` attribute of `page-root` in "101.boston/lib/index.html"

To update the server, in "101.boston/lambda", run:

```
npm install .
npm run zip
npm run up
```
