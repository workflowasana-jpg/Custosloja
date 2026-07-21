// api/auth.js
// Agrupa: login, alterar-senha, recuperar-senha, validar-token,
// login-troca, alterar-senha-temp.
// Uso: POST /api/auth  { action: 'login', usuario, senha }

const { getDb } = require('../lib/db');
const { hashSHA256 } = require('../lib/hash');
const { enviarEmail } = require('../lib/email');

async function acaoLogin(db, body) {
  const { usuario, senha } = body;
  if (!usuario || !senha) return { status: 400, json: { ok: false, erro: 'Preencha usuário e senha.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('*').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false } };

  const row = usuarios[0];
  const ativo = row.ativo !== false;
  if (row.senha_hash !== hashSHA256(senha) || !ativo) return { status: 200, json: { ok: false } };

  let grupoNome = '', permissoes = [];
  if (row.grupo_id) {
    const { data: grupos } = await db.from('grupos').select('*').eq('id', row.grupo_id).limit(1);
    if (grupos && grupos.length) {
      grupoNome = grupos[0].nome || '';
      permissoes = String(grupos[0].permissoes || '').split(',').filter(Boolean);
    }
  }

  return {
    status: 200,
    json: {
      ok: true, nome: row.nome, email: row.email || '', grupoId: row.grupo_id || '',
      grupoNome, permissoes, senhaTemp: !!row.senha_temp,
    },
  };
}

async function acaoLoginTroca(db, body) {
  const { usuario, senha } = body;
  if (!usuario || !senha) return { status: 400, json: { ok: false, erro: 'Preencha usuário e senha.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('*').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false, erro: 'Usuário ou senha incorretos.' } };

  const row = usuarios[0];
  const ativo = row.ativo !== false;
  if (row.senha_hash !== hashSHA256(senha) || !ativo) {
    return { status: 200, json: { ok: false, erro: 'Usuário ou senha incorretos.' } };
  }
  return { status: 200, json: { ok: true, senhaTemp: !!row.senha_temp, nome: row.nome } };
}

async function acaoAlterarSenha(db, body) {
  const { usuario, senhaAtual, novaSenha } = body;
  if (!usuario || !novaSenha) return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('*').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

  const row = usuarios[0];
  const viaToken = senhaAtual === '__TOKEN__';
  const hashAtual = hashSHA256(senhaAtual || '');
  const hashNova = hashSHA256(novaSenha);

  if (!viaToken) {
    if (row.senha_hash !== hashAtual) return { status: 200, json: { ok: false, erro: 'Senha atual incorreta.' } };
    if (hashAtual === hashNova) return { status: 200, json: { ok: false, erro: 'A nova senha deve ser diferente da atual.' } };
  }

  const { error: updError } = await db.from('usuarios')
    .update({ senha_hash: hashNova, senha_temp: false, token: '', token_exp: null }).eq('id', row.id);
  if (updError) throw updError;

  return { status: 200, json: { ok: true } };
}

async function acaoAlterarSenhaTemp(db, body) {
  const { usuario, novaSenha } = body;
  if (!usuario || !novaSenha) return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };
  if (novaSenha.length < 6) return { status: 400, json: { ok: false, erro: 'A senha deve ter pelo menos 6 caracteres.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('id,nome').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

  const { error: updError } = await db.from('usuarios')
    .update({ senha_hash: hashSHA256(novaSenha), senha_temp: false, token: '', token_exp: null })
    .eq('id', usuarios[0].id);
  if (updError) throw updError;

  return { status: 200, json: { ok: true } };
}

async function acaoValidarToken(db, body) {
  const { usuario, token } = body;
  if (!usuario || !token) return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('*').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

  const row = usuarios[0];
  const tokenSalvo = String(row.token || '').trim();
  const tokenExp = row.token_exp ? new Date(row.token_exp) : null;
  const agora = new Date();

  if (!tokenSalvo || tokenSalvo !== String(token).trim()) {
    return { status: 200, json: { ok: false, erro: 'Código inválido. Verifique e tente novamente.' } };
  }
  if (!tokenExp || agora > tokenExp) {
    return { status: 200, json: { ok: false, erro: 'Código expirado. Solicite um novo.' } };
  }
  return { status: 200, json: { ok: true, nome: row.nome } };
}

async function acaoRecuperarSenha(db, body) {
  const { usuario } = body;
  if (!usuario) return { status: 400, json: { ok: false, erro: 'Informe o usuário.' } };

  const { data: usuarios, error } = await db.from('usuarios').select('*').ilike('nome', usuario).limit(1);
  if (error) throw error;
  if (!usuarios || usuarios.length === 0) return { status: 200, json: { ok: false, erro: 'Usuário não encontrado.' } };

  const row = usuarios[0];
  if (!row.email) return { status: 200, json: { ok: false, erro: 'E-mail não cadastrado para este usuário.' } };

  const token = String(Math.floor(100000 + Math.random() * 900000));
  const exp = new Date();
  exp.setHours(exp.getHours() + 2);

  const { error: updError } = await db.from('usuarios')
    .update({ senha_hash: hashSHA256(token), senha_temp: true, token, token_exp: exp.toISOString() })
    .eq('id', row.id);
  if (updError) throw updError;

  try {
    await enviarEmail({
      to: row.email,
      subject: 'DTEL — Código de Redefinição de Senha',
      htmlBody:
        '<div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;">' +
        '<div style="background:#006633;padding:20px;border-radius:8px 8px 0 0;">' +
        '<h2 style="color:#F5C800;margin:0;">DTEL — Redefinição de Senha</h2></div>' +
        '<div style="background:#f9f9f9;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;">' +
        '<p>Olá, <strong>' + usuario + '</strong>!</p>' +
        '<p>Seu código de redefinição de senha é:</p>' +
        '<div style="background:#003D1F;color:#F5C800;font-size:32px;font-weight:bold;' +
        'letter-spacing:10px;padding:18px 20px;border-radius:8px;text-align:center;margin:20px 0;">' +
        token + '</div>' +
        '<p style="color:#999;font-size:11px;">Código expira em 2 horas. Se não solicitou, ignore este e-mail.</p>' +
        '</div></div>',
    });
  } catch (e) {
    return { status: 200, json: { ok: false, erro: 'Erro ao enviar e-mail: ' + e.message } };
  }

  return { status: 200, json: { ok: true, email: row.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') } };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'Método não permitido.' });

  try {
    const body = req.body || {};
    const db = getDb();
    let resultado;

    switch (body.action) {
      case 'login': resultado = await acaoLogin(db, body); break;
      case 'login-troca': resultado = await acaoLoginTroca(db, body); break;
      case 'alterar-senha': resultado = await acaoAlterarSenha(db, body); break;
      case 'alterar-senha-temp': resultado = await acaoAlterarSenhaTemp(db, body); break;
      case 'validar-token': resultado = await acaoValidarToken(db, body); break;
      case 'recuperar-senha': resultado = await acaoRecuperarSenha(db, body); break;
      default: return res.status(400).json({ ok: false, erro: 'Ação inválida: ' + body.action });
    }

    return res.status(resultado.status).json(resultado.json);
  } catch (e) {
    return res.status(500).json({ ok: false, erro: e.message });
  }
};
