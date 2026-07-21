// api/cadastros.js
// Agrupa: salvar/excluir produto, categoria e setor.
// Uso: POST /api/cadastros  { action: 'salvar-produto', nome, categoria }

const { getDb } = require('../lib/db');

const TABELAS = { produto: 'produtos', categoria: 'categorias', setor: 'setores' };

async function salvarSimples(db, tabela, nome, camposExtra) {
  if (!nome) return { status: 400, json: { ok: false, erro: 'Informe o nome.' } };

  const { data: existentes, error: checkErr } = await db.from(tabela).select('id').ilike('nome', nome).limit(1);
  if (checkErr) throw checkErr;
  if (existentes && existentes.length) {
    return { status: 200, json: { ok: false, erro: 'Já cadastrado.' } };
  }

  const { error } = await db.from(tabela).insert({ nome, ...camposExtra });
  if (error) throw error;
  return { status: 200, json: { ok: true } };
}

async function excluirSimples(db, tabela, nome) {
  if (!nome) return { status: 400, json: { ok: false, erro: 'Informe o nome.' } };

  const { data, error } = await db.from(tabela).select('id').ilike('nome', nome).limit(1);
  if (error) throw error;
  if (!data || !data.length) return { status: 200, json: { ok: false, erro: 'Não encontrado.' } };

  const { error: delErr } = await db.from(tabela).delete().eq('id', data[0].id);
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
      case 'salvar-produto':
        resultado = await salvarSimples(db, 'produtos', body.nome, { categoria: body.categoria, saldo: 0 });
        break;
      case 'excluir-produto':
        resultado = await excluirSimples(db, 'produtos', body.nome);
        break;
      case 'salvar-categoria':
        resultado = await salvarSimples(db, 'categorias', body.nome, {});
        break;
      case 'excluir-categoria':
        resultado = await excluirSimples(db, 'categorias', body.nome);
        break;
      case 'salvar-setor':
        resultado = await salvarSimples(db, 'setores', body.nome, {});
        break;
      case 'excluir-setor':
        resultado = await excluirSimples(db, 'setores', body.nome);
        break;
      default:
        return res.status(400).json({ ok: false, erro: 'Ação inválida: ' + body.action });
    }

    return res.status(resultado.status).json(resultado.json);
  } catch (e) {
    return res.status(500).json({ ok: false, erro: e.message });
  }
};
