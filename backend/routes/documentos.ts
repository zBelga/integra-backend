import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado no .env');
  return createClient(url, key);
}

function generateId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// GET /api/documentos/colaborador/:id — lista documentos de um colaborador
router.get('/colaborador/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('colaborador_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/documentos/upload — faz upload de um documento
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const {
      colaborador_id,
      empresa_id,
      tipo,
      nome,
      nome_arquivo,
      fileBase64,
      mimeType,
      data_emissao,
      data_vencimento,
      observacoes,
    } = req.body;

    if (!colaborador_id || !tipo || !nome || !nome_arquivo || !fileBase64) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando.' });
    }

    const supabase = getSupabase();
    const buffer = Buffer.from(fileBase64, 'base64');
    const id = generateId();
    const ext = nome_arquivo.split('.').pop()?.toLowerCase() || 'bin';
    const storagePath = `${empresa_id || 'geral'}/${colaborador_id}/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
      .from('documentos')
      .insert({
        id,
        colaborador_id,
        empresa_id: empresa_id || 'geral',
        tipo,
        nome,
        nome_arquivo,
        storage_path: storagePath,
        tamanho_bytes: buffer.length,
        data_emissao: data_emissao || '',
        data_vencimento: data_vencimento || '',
        observacoes: observacoes || '',
        status: 'ativo',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: remove o arquivo do storage
      await supabase.storage.from('documentos').remove([storagePath]);
      throw dbError;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documentos/:id/download — retorna URL assinada para download
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('storage_path, nome_arquivo')
      .eq('id', req.params.id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.storage_path, 120); // válido por 2 minutos

    if (error) throw error;

    res.json({ success: true, url: data.signedUrl, nome_arquivo: doc.nome_arquivo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/documentos/:id — exclui documento e arquivo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: doc, error: docError } = await supabase
      .from('documentos')
      .select('storage_path')
      .eq('id', req.params.id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
    }

    await supabase.storage.from('documentos').remove([doc.storage_path]);

    const { error: dbError } = await supabase
      .from('documentos')
      .delete()
      .eq('id', req.params.id);

    if (dbError) throw dbError;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
