// lib/sequencial.js
// Equivalente a proximoSequencial() e _incrementarSequencial() do Apps Script.

const { getDb } = require('./db');

/** Retorna o próximo número de pedido (ex: "#1088") e incrementa o contador. */
async function proximoSequencial() {
  const db = getDb();
  const { data, error } = await db
    .from('sequencial')
    .select('valor')
    .eq('chave', 'PedidoSeq')
    .limit(1);
  if (error) throw error;

  const atual = data && data.length ? parseInt(data[0].valor) || 1001 : 1001;

  const { error: updError } = await db
    .from('sequencial')
    .upsert({ chave: 'PedidoSeq', valor: atual + 1 });
  if (updError) throw updError;

  return '#' + atual;
}

/** Só incrementa o contador, sem retornar o valor (usado após salvar solicitação). */
async function incrementarSequencial() {
  const db = getDb();
  const { data, error } = await db
    .from('sequencial')
    .select('valor')
    .eq('chave', 'PedidoSeq')
    .limit(1);
  if (error) throw error;

  const atual = data && data.length ? parseInt(data[0].valor) || 1001 : 1001;

  await db.from('sequencial').upsert({ chave: 'PedidoSeq', valor: atual + 1 });
}

module.exports = { proximoSequencial, incrementarSequencial };
