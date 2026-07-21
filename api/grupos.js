// api/grupos.js
// Agrupa: salvar-grupo, excluir-grupo, atribuir-grupo-usuarios.
// Uso: POST /api/grupos  { action: 'salvar-grupo', ... }

const { getDb } = require('../lib/db');

async function acaoSalvarGrupo(db, body) {
  const { id, nome, cor, permissoes } = body;
  if (!id || !nome) return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };

  const permsStr = Array.isArray(permissoes) ? permissoes.join(',') : String(permissoes || '');
  const { error } = await db.from('grupos').upsert({ id, nome, cor: cor || '#006633', permissoes: permsStr });
  if (error) throw error;

  return { status: 200, json: { ok: true } };
}

async function acaoExcluirGrupo(db, body) {
  const { id } = body;
  if (!id) return { status: 400, json: { ok: false, erro: 'Informe o ID do grupo.' } };
  if (id === 'adm') return { status: 200, json: { ok: false, erro: 'Não é possível excluir o grupo ADM.' } };

  const { data, error } = await db.from('grupos').select('id').eq('id', id).limit(1);
  if (error) throw error;
  if (!data || !data.length) return { status: 200, json: { ok: false, erro: 'Grupo não encontrado.' } };

  const { error: delErr } = await db.from('grupos').delete().eq('id', id);
  if (delErr) throw delErr;

  return { status: 200, json: { ok: true } };
}

async function acaoAtribuirGrupoUsuarios(db, body) {
  const { grupoId, nomesUsuarios } = body;
  if (!grupoId || !Array.isArray(nomesUsuarios) || !nomesUsuarios.length) {
    return { status: 400, json: { ok: false, erro: 'Dados incompletos.' } };
  }

  const { error } = await db.from('usuarios').update({ grupo_id: grupoId }).in('nome', nomesUsuarios);
  if (error) throw error;

  return { status: 200, json: { ok: true } };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'Método não permitido.' });

  try {
    const body = req.body || {};
    const db = getDb();
    let resultado;

    switch (body.action) {
      case 'salvar-grupo': resultado = await acaoSalvarGrupo(db, body); break;
      case 'excluir-grupo': resultado = await acaoExcluirGrupo(db, body); break;
      case 'atribuir-grupo-usuarios': resultado = await acaoAtribuirGrupoUsuarios(db, body); break;
      default: return res.status(400).json({ ok: false, erro: 'Ação inválida: ' + body.action });
    }

    return res.status(resultado.status).json(resultado.json);
  } catch (e) {
    return res.status(500).json({ ok: false, erro: e.message });
  }
};
