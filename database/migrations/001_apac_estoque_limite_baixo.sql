-- Corrige bancos criados pelo schema antigo do Sipan.Service.Web (sem limite_baixo_estoque).
USE sipan;

ALTER TABLE apac_estoque
  ADD COLUMN limite_baixo_estoque INT UNSIGNED NOT NULL DEFAULT 5 AFTER local;
