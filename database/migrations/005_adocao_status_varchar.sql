USE sipan;

-- Corrige status corrompido na migração Windows (ENUM com acentos quebrados)
ALTER TABLE solicitacoes_adocao
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Pendente';

UPDATE solicitacoes_adocao SET status = 'Pendente' WHERE status NOT IN (
  'Pendente', 'Em análise', 'Aprovada', 'Recusada', 'Concluída'
) OR status LIKE '%??%';
