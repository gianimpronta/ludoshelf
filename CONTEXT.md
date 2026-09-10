# LudoShelf

Organizador 3D para estantes de jogos de tabuleiro, calculando arranjos físicos e permitindo inspeção interativa.

## Language

**Caixa de Jogo**:
Representação física de um jogo de tabuleiro com suas dimensões reais em milímetros inteiros, procedência de medidas e frequência.
_Avoid_: Jogo, item, tabuleiro

**Compartimento**:
Subdivisão útil de uma estante com largura, profundidade e altura da base até o chão.
_Avoid_: Nicho, vão

**Arranjo**:
Atribuição física calculada de cada caixa de jogo a um compartimento da estante, com pose e deslocamento espacial definidos.
_Avoid_: Layout, empacotamento, distribuição

**Pose**:
Orientação em que uma caixa de jogo fica apoiada no compartimento (retrato ou paisagem).
_Avoid_: Posição, rotação, inclinação

**Procedência da Medida**:
Canal de origem dos dados de dimensão da caixa (manual, semeada, planilha ou bgg).
_Avoid_: Fonte, procedência, autoria

**Foco**:
Realce visual sutil e efêmero exibido ao passar o cursor sobre uma caixa na cena 3D ou em seu item na lista do arranjo.
_Avoid_: Hover, mira, mouseover

**Seleção**:
Estado ativado ao clicar em uma caixa ou item de lista, que fixa o contorno destacado e abre os detalhes contextuais de inspeção.
_Avoid_: Clique, marcação, active

**Painel de Inspeção**:
Componente que exibe os metadados, procedência de medidas e localização física da caixa de jogo selecionada.
_Avoid_: Detalhes, ficha, visualizador

**Lista do Arranjo**:
Lista estruturada de conferência na tela de arranjo que agrupa os jogos alocados por compartimento e sincroniza foco e seleção com o 3D.
_Avoid_: Tabela de jogos, grid, inventário

**Snapshot**:
Imagem PNG exportada da cena 3D que captura com fidelidade a vista e ângulo atuais da câmera, em resolução normal ou ampliada.
_Avoid_: Print, screenshot, foto
