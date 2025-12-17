import { OPS, OP } from "opaque-low-io";

const toClient = async (sock_in, channel) => {
  if (channel != "ws") {
     return null;
  }
  const {
    ws_url, delay
  } = sock_in;
  const queue = [];
  let ws = new WebSocket(ws_url);
  const check_ws_is = (k) => {
    return ws.readyState === WebSocket[k];
  }
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", (event) => {
      resolve();
    })
  });
  if (!check_ws_is('OPEN')) {
    console.log("ws is not OPEN");
    return null;
  }
  ws.onmessage = (ev) => {
    queue.push(ev);
  }
  const close = () => {
    if (!check_ws_is('CLOSED')) {
      ws.close(1000);
    }
  }
  return {
    give: async (op_id, k, v) => {
      ws.send(JSON.stringify({
        op_id, k, v
      }))
    },
    get: async (op_id, k) => {
      while (queue.length === 0) {
        console.log('...')
        const dt = delay * 1000;
        await new Promise(r => setTimeout(r, dt));
      }
      return queue.pop();
    },
    quit: () => {
      close();
    }
  }
}

const SINCE = "last-modified"

async function toOpaqueSock(opts, channel, workflow) {
  const {
    delay, ws_url,
    output
  } = opts;
  if ("key" in output) {
    output.workflow = workflow;
  }
  const since = sessionStorage.getItem(SINCE);
  const sock_in = {
    delay, ws_url
  };
  if (since) sock_in.persist = { [SINCE]: since };
  const Sock = await toClient(sock_in, channel);
  if (Sock === null) {
    throw new Error('Unable to make socket.');
  }
	await Sock.give("op_id", "client_auth_data", {
		"client_auth_data": {
			username: opts.user_id,
			password: opts.pass
		}
	})
	await Sock.get()
	return Sock;
//  const Opaque = await OP(Sock);
//  return { Opaque, Sock };
}

const toSyncOp = async () => {
  return await OPS();
}

async function clientRegister(opts) {
  const { user_id, pass, times } = opts;
  const c_first = { password: pass, user_id };
  const Sock = await toOpaqueSock(opts, "ws", "call-login-open");
//  const { Sock, Opaque } = await toOpaqueSock(opts, "ws", "call-login-open");
//  const reg_out = await Opaque.clientStep(c_first, times, "op");
  Sock.quit();
  return {
		user_id, pass
	};
}

/*
async function clientVerify(opts) {
  const { reg_out, times, register } = opts;
  const { Sock, Opaque } = await toOpaqueSock(opts, "ws", "call-login-close");
  const c_out = await Opaque.clientStep(reg_out, times, "op");
  // Await for login-close to finish by checking mail
  if ( register === true ) await Sock.get("mail", "session");
const persist = Sock.quit();
  if (SINCE in persist) {
    sessionStorage.setItem(SINCE, persist[SINCE]);
  }
  return c_out.token;
}
*/

async function clientLogin(opts) {
//  const reg_out = await clientRegister(opts);
//  return await clientVerify({ ...opts, reg_out });
}

const writeText = async (f, text) => {
  const w = await f.createWritable();
  await w.write(text);
  await w.close();
}

const readFile = async (opts) => {
  const { root, fname } = opts;
  const toF = root.getFileHandle.bind(root);
  const f = await toF(fname, { create: true });
  return await (await f.getFile()).text();
}

const writeFile = async (opts) => {
  const method = 'POST';
  const { fname, text: body } = opts;
  await fetch('/'+fname, { body, method });
}

export { 
	clientRegister,
  toSyncOp, writeText, writeFile, readFile
};
