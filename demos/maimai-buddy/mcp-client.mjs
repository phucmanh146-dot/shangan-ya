// Node 20+; run with MCD_MCP_TOKEN set only in local environment.
// Never commit your actual token. Discovers the real tools instead of fabricating their names.
const endpoint = 'https://mcp.mcd.cn';
const token = process.env.MCD_MCP_TOKEN;
if (!token) { console.error('请先在本机设置 MCD_MCP_TOKEN，禁止将 Token 提交到 GitHub'); process.exit(1); }
let session = '';
async function rpc(method, params, id) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream',
    'Authorization': 'Bearer ' + token };
  if (session) headers['Mcp-Session-Id'] = session;
  const response = await fetch(endpoint, {method:'POST', headers, body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
  if (!response.ok) throw new Error('MCP HTTP ' + response.status + '; check token permissions and network');
  session = response.headers.get('mcp-session-id') || session;
  const raw = await response.text();
  const lines = raw.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
  let result = null;
  for (const line of (lines.length ? lines : [raw])) {
    if (line === '[DONE]') continue;
    try { const obj=JSON.parse(line); if (obj.id === id) result=obj; } catch {}
  }
  if (!result) throw new Error('No matching MCP JSON-RPC response');
  if (result.error) throw new Error(result.error.message || 'MCP error');
  return result.result;
}
try {
  const hello = await rpc('initialize', { protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'maimai-buddy',version:'0.1.0'} }, 1);
  console.log('Server:', hello.serverInfo || 'initialized');
  const list = await rpc('tools/list', {}, 2);
  console.log('Available tool names:', (list.tools || []).map(t=>t.name));
  console.log('Read the real tool schemas, then develop a verified price-lookup workflow.');
} catch(e) { console.error('Connection failed:',e.message);process.exitCode=1; }
