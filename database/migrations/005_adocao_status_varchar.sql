USE sipan;

SET @tbl_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'solicitacoes_adocao'
);

SET @sql := IF(
  @tbl_exists > 0,
  'ALTER TABLE solicitacoes_adocao MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT ''Pendente''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @tbl_exists > 0,
  'UPDATE solicitacoes_adocao SET status = ''Pendente'' WHERE status NOT IN (
    ''Pendente'', ''Em análise'', ''Aprovada'', ''Recusada'', ''Concluída''
  ) OR status LIKE ''%??%''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
