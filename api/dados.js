// api/carregar-dados.js
// Equivalente a carregarDadosIniciais() / carregarDadosLeves() do Apps Script.
// Uso: POST /api/carregar-dados  { full: true|false }
// full=true  -> inclui o histórico completo da tabela "registros" (mais pesado)
// full=false -> tudo, exceto o histórico (mais rápido — usado após ações comuns)

const { getDb } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  try {
    const { full } = req.body || {};
    const db = getDb();

    const [produtosR, setoresR, categoriasR, gruposR, usuariosR, pendentesR, seqR] =
      await Promise.all([
        db.from('produtos').select('nome,categoria,saldo'),
        db.from('setores').select('nome'),
        db.from('categorias').select('nome'),
        db.from('grupos').select('id,nome,cor,permissoes'),
        db.from('usuarios').select('nome,email,grupo_id,ativo'),
        db.from('pendentes').select('*'),
        db.from('sequencial').select('valor').eq('chave', 'PedidoSeq').limit(1),
      ]);

    for (const r of [produtosR, setoresR, categoriasR, gruposR, usuariosR, pendentesR, seqR]) {
      if (r.error) throw r.error;
    }

    const produtosMock = (produtosR.data || []).map((r) => ({
      nome: r.nome || '',
      cat: r.categoria || '',
      saldo: r.saldo || 0,
    }));

    const setoresGlobais = (setoresR.data || []).map((r) => r.nome).filter(Boolean);
    const categoriasGlobais = (categoriasR.data || []).map((r) => r.nome).filter(Boolean);

    const gruposDatabase = (gruposR.data || []).map((r) => ({
      id: r.id,
      nome: r.nome,
      cor: r.cor || '#006633',
      permissoes: String(r.permissoes || '').split(',').filter(Boolean),
    }));

    const usuariosDatabase = (usuariosR.data || []).map((r) => ({
      nome: r.nome,
      email: r.email || '',
      grupoId: r.grupo_id || '',
      ativo: r.ativo !== false,
    }));

    const mockBasePedidosPendentes = (pendentesR.data || []).map((r) => ({
      pedido: r.pedido_id || '',
      data: r.data || '',
      item: r.item || '',
      cat: r.categoria || '',
      qtd: r.qtd_soli || 0,
      qtdDispo: r.qtd_dispo || 0,
      setor: r.setor || '',
      solicitante: r.solicitante || '',
      responsavel: r.responsavel || '',
      disponivel: !!r.disponivel,
    }));

    const sequencialPedido =
      seqR.data && seqR.data.length ? parseInt(seqR.data[0].valor) || 1001 : 1001;

    const resposta = {
      produtosMock,
      setoresGlobais,
      categoriasGlobais,
      gruposDatabase,
      usuariosDatabase,
      mockBasePedidosPendentes,
      sequencialPedido,
    };

    if (full) {
      const { data: registros, error } = await db
        .from('registros')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;

      resposta.databaseRegistros = (registros || []).map((r) => {
        const dt = r.data ? new Date(r.data) : null;
        const MESES_EXT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        let mes = '', mesNum = '', ano = '';
        if (dt && !isNaN(dt.getTime())) {
          mesNum = String(dt.getMonth() + 1).padStart(2, '0');
          mes = MESES_EXT[dt.getMonth()];
          ano = String(dt.getFullYear());
        }
        return {
          pedido: r.pedido || '',
          data: r.data || '',
          mes,
          mesNum,
          ano,
          nf: r.nf || '',
          item: r.item || '',
          cat: r.categoria || '',
          qtdSoli: r.qtd_soli || 0,
          qtdDispo: r.qtd_dispo || 0,
          preco: r.preco || 0,
          setor: r.setor || '',
          solicitante: r.solicitante || '',
          responsavel: r.responsavel || '',
          tipo: r.tipo || '',
          justificativa: r.justificativa || '',
        };
      });
    }

    return res.status(200).json(resposta);
  } catch (e) {
    return res.status(500).json({ ok: false, erro: e.message });
  }
};
