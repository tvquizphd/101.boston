import { 
	ApiGatewayManagementApiClient, PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi';
import { OPS, OP } from "opaque-low-io";
import { Octokit } from "octokit";
import http from 'http';
import crypto from "crypto";
import {
	SecretsManagerClient,
	GetSecretValueCommand,
	CreateSecretCommand
} from "@aws-sdk/client-secrets-manager";

const random_mbta_stop = () => {
  const stops = [
        "place-alfcl", "place-davis", "place-portr", "place-harsq", "place-cntsq", "place-knncl", "place-sull", "place-astao", "place-welln", "place-mlmnl", "place-ogmnl", "place-lech", "place-unsqu", "place-esomr", "place-gilmn", "place-mgngl", "place-balsq", "place-mdftf", "2718", "2719", "2721", "2723", "2725", "2726", "2729", "5305", "5306", "5307", "5308", "5309", "5310", "5311", "5312", "5314", "5315", "5316", "5034", "5317", "5319", "63241", "50021", "45003", "5321", "5322", "5323", "5324", "5325", "5333", "5334", "5335", "5336", "5337", "5338", "place-NHRML-0055", "5040", "5328", "9028", "5330", "5331", "45332", "5332", "8308", "5282", "5283", "5284", "5285", "5286", "5287", "5002", "5031", "5032", "5290", "5291", "5292", "5293", "5294", "5295", "5296", "5297", "5298", "5299", "5300", "5301", "5302", "5303", "2704", "2706", "2707", "2710", "2711", "2713", "2714" ]
  return stops[Math.floor(Math.random() * stops.length)];
}
const to_date = (iso_date, hour, minute=0) => {
	const h = `${hour}`.padStart(2, '0');
	const m = `${minute}`.padStart(2, '0');
	return `${iso_date}T${h}:${m}`;
  }       
const new_item = () => {
  return {
      "title": "Lost Cat",
      "stop_key": random_mbta_stop(),
      "pickup": to_date("2025-12-21", 0),
      "item_key": crypto.randomUUID(),
  }
}

const create_aws_secret = async (name, value) => {
	const client = new SecretsManagerClient({
		region: "us-east-2",
	});
	const input = {
		ClientRequestToken: crypto.randomUUID(),
		Description: "",
		Name: name,
		SecretString: JSON.stringify(value) 
	};
	const command = new CreateSecretCommand(input);
	const response = await client.send(command);
	console.log("DEBUG: we saved the secret")
	return {input, response};
}

const read_aws_secret = async (secret_name) => {
	const client = new SecretsManagerClient({
		region: "us-east-2",
	});
	let response;
	try {
		response = await client.send(
			new GetSecretValueCommand({
				SecretId: secret_name,
				VersionStage: "AWSCURRENT"
			})
		);
	} catch (error) {
		return {}
	}
	return JSON.parse(response.SecretString);
};

const login_github = async () => {
  let auth = "";
	try {
		const result = await read_aws_secret(
			"GITHUB_TOKEN"
		);
		const { GITHUB_TOKEN } = result;
		auth = GITHUB_TOKEN;
	}
	catch (error) {
		return null;
	}
	return {
    auth,
    octokit: new Octokit({ auth })
  };
}

async function add_items(
  octokit, auth, options, items
) {
  const { owner, repo, path, branch } = options;
  const { name, email, message } = options;
  const root = "https://api.github.com";
  const route = `${root}/repos/${owner}/${repo}/contents/${path}`;
  const result = await fetch(`${route}?ref=${branch}`, {
    headers: {
      Accept: "application/vnd.github.object",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${auth}`
    }
  })
  const { list, sha } = await (async () => {
    try {
      const { content, sha } = JSON.parse(await result.text());
      const list = Buffer.from(content, 'base64').toString('utf-8');
      return { list, sha };
    }
    catch (e) {
      console.error(e);
      return { list: [], sha: null };
    }
  })();
  // TODO, create
  console.log('OOPS YAY', list);
  if (!list.length) {
    return;
  }
  console.log('OOPS YAY', list);
  console.log('OOPS YAY', JSON.stringify(list.concat(items)))
  const content = Buffer.from(
    JSON.stringify(JSON.parse(list).concat(items)), 'utf8'
  ).toString('base64');
  console.log('OOPS YAY', content);
  const body = {
    sha, content, branch,
    message: 'update database',
    committer: {
      name: name,
      email: 'john@hoff.in'
    }
  }
  console.log('OOPS YAY', body);
  const output = await fetch(route, {
    method: "PUT",
    body: JSON.stringify(body), 
    headers: {
      Accept: "application/vnd.github.object",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${auth}`
    }
  })
  console.log('OOPS YAY', output)
	return { content: null }
}

/*
const vStart = async (opts) => {
  const { reset, tree, pep } = opts;
  const { commands, pub_ctli } = opts;
  const { OPEN_IN, OPEN_OUT } = commands;
  const { OPEN_NEXT } = commands;
  const inputs = [{ command: OPEN_IN, tree }];
  const { Opaque, Sock } = await toUserSock({ inputs });
  const times = 1000;
  const pepper_in = {
    Opaque, times, reset, pep, tree
  };
  const reg = await toPepper(pepper_in);
  const pep_out = { command: pep, tree: reg.pepper };
  const final = await Opaque.serverStep(reg, "op");
  const pages_out = Sock.quit().find(nt => {
    return nt.command === OPEN_OUT;
  });
  if (!pages_out || !isServerOut(pages_out.tree)) {
    throw new Error('Unable to initialize opaque');
  }
  const next_tree: LastStep = { final };
  if (reset && opts.shared.length) {
    const { shared } = opts;
    next_tree.user = { shared };
  }
  const next_out = { command: OPEN_NEXT, tree: next_tree };
  const for_next = fromCommandTreeList([ next_out ]);
  const secrets = [ pep_out, next_out ];
  const old_out = pub_ctli.filter((ct) => {
    return ct.command !== pages_out.command;
  });
  const for_pages = fromCommandTreeList([ ...old_out, pages_out ]);
  return { for_next, for_pages, secrets }
}
*/

export const handler = async (event) => {
  console.log('WebSocket event received:', event);
  // Ensure this matches client index.html
  const git_options = {
			path: "database.json",
      branch: "after-deadline",
      name: "John",
      message: "update item list",
      email: "john@hoff.in",
			owner: "tvquizphd",
			repo: "101.boston"
  }

	const { connectionId, domainName, stage } = event.requestContext;
	const { routeKey } = event.requestContext;
  // e.g., "$connect", "$disconnect", "sendMessage"
  //const body = event.body ? JSON.parse(event.body) : {};
  // No JSON, IDK?

  let response;

  switch (routeKey) {
    case '$connect':
      // Handle new connection
      console.log('Client connected:', connectionId);
      response = { statusCode: 200, body: 'Connected.' };
      break;
    case '$disconnect':
      // Handle disconnection
      console.log('Client disconnected:', connectionId);
      response = { statusCode: 200, body: 'Disconnected.' };
      break;
    case 'client_auth_data':

			const body = JSON.parse(event.body);
			const { username, password } = body.v.client_auth_data;

			const{ octokit, auth } = await login_github();
			let github_result = null;
			if (octokit) {
				github_result = await add_items(octokit, auth, git_options, [
          new_item()
        ])
		}
			try {
				await create_aws_secret(
					username, { password }
				);
			}
			catch (e) {
				console.log("Username Already exists")
				console.log(e);	
			}

			// Respond
			const apiGatewayClient = new ApiGatewayManagementApiClient({
					endpoint: `https://${domainName}/${stage}`,
			});
			await apiGatewayClient.send(new PostToConnectionCommand({
					ConnectionId: connectionId,
					Data: JSON.stringify({ ok: "ok" }),
			}));
      response = { statusCode: 200, body: 'OK' };
      break;
    default:
      // Handle other routes or $default
      console.log('Default route or unknown action:', routeKey);
      response = { statusCode: 404, body: 'Action not found.' };
  }
  return response;
};
