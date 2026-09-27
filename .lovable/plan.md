# Âncoras dinâmicas ao mover blocos

## Implementação
- Recalcular somente as conexões ligadas ao bloco que estiver sendo movido.
- Trocar origem e destino para as âncoras com menor distância entre os dois blocos.
- Atualizar durante o arraste e confirmar a posição final ao soltar, incluindo blocos movidos em grupo.

## Validação
- Mover um bloco conectado em diferentes lados do bloco vizinho.
- Confirmar que a linha muda de âncora sem criar ou excluir conexões.
- Verificar o criador sem erros.
