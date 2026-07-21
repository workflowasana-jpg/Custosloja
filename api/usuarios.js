// api/usuarios.js
// Agrupa: salvar-usuario (novo/editar), excluir-usuario.
// Uso: POST /api/usuarios  { action: 'salvar-usuario', ... }

const { getDb } = require('../lib/db');
const { hashSHA256 } = require('../lib/hash');
const { enviarEmail } = require('../lib/email');

const WEBAPP_URL = process.env.WEBAPP_URL || '';

async function acaoSalvarUsuario(db, body) {
  const { nome, email, senha, grupoId, editando, nomeOriginal } = body;
  if (!nome || !email || !grupoId) return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };

  if (editando) {
    const alvoNome = nomeOriginal || nome;
    const { data: existentes, error: findErr } = await db.from('usuarios').select('id').ilike('nome', alvoNome).limit(1);
    if (findErr) throw findErr;
    if (!existentes || !existentes.length) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

    const updateData = { nome, email, grupo_id: grupoId };
    if (senha) updateData.senha_hash = hashSHA256(senha);

    const { error: updError } = await db.from('usuarios').update(updateData).eq('id', existentes[0].id);
    if (updError) throw updError;

    return { status: 200, json: { ok: true } };
  }

  const { data: dup, error: dupErr } = await db.from('usuarios').select('id').ilike('nome', nome).limit(1);
  if (dupErr) throw dupErr;
  if (dup && dup.length) return { status: 200, json: { ok: false, erro: 'Usuário já existe.' } };

  const senhaInicial = 'Dtel@' + String(Math.floor(1000 + Math.random() * 9000));
  const tokenNovo = String(Math.floor(100000 + Math.random() * 900000));
  const expNovo = new Date();
  expNovo.setHours(expNovo.getHours() + 48);

  const { error: insErr } = await db.from('usuarios').insert({
    nome, email, senha_hash: hashSHA256(senhaInicial), grupo_id: grupoId,
    ativo: true, senha_temp: true, token: tokenNovo, token_exp: expNovo.toISOString(),
  });
  if (insErr) throw insErr;

  try {
    await enviarEmail({
      to: email,
      subject: 'DTEL — Bem-vindo! Seus dados de acesso',
      htmlBody:
        '<div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;">' +
        '<div style="background:#006633;padding:20px;border-radius:8px 8px 0 0;">' +
        '<h2 style="color:#F5C800;margin:0;">DTEL — Bem-vindo!</h2></div>' +
        '<div style="background:#f9f9f9;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;">' +
        '<p>Olá, <strong>' + nome + '</strong>! Seu acesso foi criado.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' +
        '<tr><td style="padding:8px;background:#f0f0f0;font-weight:bold;border:1px solid #ddd;">Usuário</td>' +
        '<td style="padding:8px;border:1px solid #ddd;">' + nome + '</td></tr>' +
        '<tr><td style="padding:8px;background:#f0f0f0;font-weight:bold;border:1px solid #ddd;">Senha Inicial</td>' +
        '<td style="padding:8px;border:1px solid #ddd;font-family:monospace;">' + senhaInicial + '</td></tr>' +
        '</table>' +
        '<div style="background:#F0FFF6;border:1px solid #B7F5C8;border-radius:10px;padding:16px 18px;margin:20px 0;">' +
        '<p style="margin:0 0 10px 0;font-weight:700;color:#003D1F;">📋 Como acessar o sistema:</p>' +
        '<ol style="margin:0;padding-left:18px;color:#333;line-height:1.9;">' +
        '<li>Acesse o sistema pelo link abaixo</li>' +
        '<li>Insira seu <strong>usuário</strong> e a <strong>senha inicial</strong> informada neste e-mail</li>' +
        '<li>Ao logar, você será solicitado a criar uma nova senha</li>' +
        '</ol>' +
        '<div style="margin-top:14px;"><a href="' + WEBAPP_URL + '" style="color:#006633;font-weight:700;word-break:break-all;">' + WEBAPP_URL + '</a></div>' +
        '</div>' +
        '<p style="color:#999;font-size:11px;">Se recebeu por engano, ignore este e-mail.</p>' +
        '</div></div>',
    });
  } catch (e) {
    console.error('Erro e-mail boas-vindas:', e.message);
  }

  return { status: 200, json: { ok: true } };
}

async function acaoExcluirUsuario(db, body) {
  const { nome } = body;
  if (!nome) return { status: 400, json: { ok: false, erro: 'Informe o nome do usuário.' } };

  const { data, error } = await db.from('usuarios').select('id').ilike('nome', nome).limit(1);
  if (error) throw error;
  if (!data || !data.length) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

  const { error: delErr } = await db.from('usuarios').delete().eq('id', data[0].id);
  if (delErr) throw delErr;

  return { status: 200, json: { ok: true } };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'Método não permitido.' });

  try {
    const body = req.body || {};
    const db = getDb();
    let resultado;

    switch (body.action) {
      case 'salvar-usuario': resultado = await acaoSalvarUsuario(db, body); break;
      case 'excluir-usuario': resultado = await acaoExcluirUsuario(db, body); break;
      default: return res.status(400).json({ ok: false, erro: 'Ação inválida: ' + body.action });
    }

    return res.status(resultado.status).json(resultado.json);
  } catch (e) {
    return res.status(500).json({ ok: false, erro: e.message });
  }
};
