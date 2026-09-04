-- Habilita as extensões necessárias para busca tolerante a acento e digitação (conforme INFRA.md)
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Função wrapper imutável para indexação com unaccent
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$SELECT public.unaccent('public.unaccent'::regdictionary, $1)$$;

DROP TABLE IF EXISTS "versoes_catalogo" CASCADE;
DROP TABLE IF EXISTS "jogos_catalogo" CASCADE;

-- CreateTable
CREATE TABLE "jogos_catalogo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_bgg" INTEGER,
    "id_ludopedia" INTEGER,
    "ean" VARCHAR(20),
    "nome" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "ano_lancamento" INTEGER,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jogos_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versoes_catalogo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jogo_id" UUID NOT NULL,
    "id_bgg_versao" INTEGER,
    "nome_versao" VARCHAR(255) NOT NULL,
    "editora" VARCHAR(150),
    "idioma" VARCHAR(50),
    "ano" INTEGER,
    "maior_mm" INTEGER NOT NULL,
    "menor_mm" INTEGER NOT NULL,
    "espessura_mm" INTEGER NOT NULL,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "fonte" VARCHAR(50) NOT NULL DEFAULT 'bgg',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versoes_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jogos_catalogo_id_bgg_key" ON "jogos_catalogo"("id_bgg");

-- CreateIndex
CREATE UNIQUE INDEX "jogos_catalogo_id_ludopedia_key" ON "jogos_catalogo"("id_ludopedia");

-- CreateIndex
CREATE UNIQUE INDEX "jogos_catalogo_slug_key" ON "jogos_catalogo"("slug");

-- Índices de busca por texto com trigrama e unaccent
CREATE INDEX IF NOT EXISTS "idx_jogos_catalogo_nome_trgm" ON "jogos_catalogo" USING gin ("nome" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_jogos_catalogo_nome_unaccent_trgm" ON "jogos_catalogo" USING gin (immutable_unaccent("nome") gin_trgm_ops);

-- CreateIndex
CREATE INDEX "versoes_catalogo_jogo_id_idx" ON "versoes_catalogo"("jogo_id");

-- CreateIndex
CREATE UNIQUE INDEX "versoes_catalogo_jogo_id_id_bgg_versao_key" ON "versoes_catalogo"("jogo_id", "id_bgg_versao");

-- AddForeignKey
ALTER TABLE "versoes_catalogo" ADD CONSTRAINT "versoes_catalogo_jogo_id_fkey" FOREIGN KEY ("jogo_id") REFERENCES "jogos_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
