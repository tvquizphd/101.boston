import { OPS, OP } from "opaque-low-io";
import { Octokit } from "octokit";
import http from 'http';
import {
	createOrUpdateTextFile
} from "@octokit/plugin-create-or-update-text-file";
import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const read_secret = async (secret_name) => {
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
		throw error;
	}
	return response.SecretString;
};

const login_github = async () => {
  const auth = await read_secret(
		"GITHUB_TOKEN"
  );
	const GitHubEditor = Octokit.plugin(
		createOrUpdateTextFile
	);
	return new GitHubEditor({ auth });
}

const add_entries = async (octokit, entries) => {
	const { updated, deleted, data } = await octokit.createOrUpdateTextFile({
		owner: "tvquizphd",
		repo: "101.boston",
		path: "database.json",
		content({ exists, content }) {
			// do not create file
			if (!exists) return null;
			const existing = JSON.parse(content);
			return JSON.stringify([
				...existing, ...entries
			])
		},
		message: "update database",
	})
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

  const connectionId = event.requestContext.connectionId;
  // e.g., "$connect", "$disconnect", "sendMessage"
  const routeKey = event.requestContext.routeKey;
  //const body = event.body ? JSON.parse(event.body) : {};
  // No JSON, IDK?
  const body = event;

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
      // Handle a custom message 
      console.log(`client auth Message from ${connectionId}: ${body.message}`);
      // Implement logic to retrieve all connections from DB and send message
      // using the ApiGatewayManagementApi
      response = { statusCode: 200, body: 'Message received.' };
			const octokit = await login_github();
			await add_entries(octokit, ["TEST", "FOO", "BAR"])
      break;

    default:
      // Handle other routes or $default
      console.log('Default route or unknown action:', routeKey);
      response = { statusCode: 404, body: 'Action not found.' };
  }
  return response;
};
