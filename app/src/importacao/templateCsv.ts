/**
 * Gera um template de planilha CSV com BOM UTF-8 e delimitador ';' (padrão de compatibilidade Excel),
 * com linhas de exemplo didáticas (jogo base e expansão).
 */
export function gerarTemplateCsv(): string {
  const cabecalho = 'Nome;Comprimento (mm);Largura (mm);Espessura (mm);Unidade;Jogo-Base;Partidas'
  const linhas = [
    'Catan;295;220;70;mm;;12',
    'Catan: Cidades & Cavaleiros;295;220;50;mm;Catan;5',
    'Azul;260;260;70;mm;;8',
    'Dixit;277;277;55;mm;;20',
  ]
  return `\uFEFF${cabecalho}\r\n${linhas.join('\r\n')}\r\n`
}
