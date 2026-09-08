import { Edges, Html, OrbitControls, Outlines } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import type { Arranjo, ContextoDeArranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { mapear, type ObjetoNaCena } from './mapear.js'

export interface PropsCenaDoArranjo {
  readonly arranjo: Arranjo
  readonly contexto: ContextoDeArranjo
  readonly estante: Estante
  readonly idJogoEmFoco?: string | null | undefined
  readonly idJogoSelecionado?: string | null | undefined
  readonly aoFocarJogo?: ((idJogo: string | null) => void) | undefined
  readonly aoClicarJogo: (idJogo: string) => void
  readonly aoClicarFundo?: (() => void) | undefined
}

/**
 * Cena 3D burra por design (spec §9): recebe `Arranjo` pronto e desenha, nunca
 * decide posição — isso é trabalho de `mapear`. Suporta interatividade via
 * foco (emissive suave), seleção com contorno destacado (Outlines) e iluminação,
 * além de clique no fundo para desseleção.
 */
export function CenaDoArranjo({
  arranjo,
  contexto,
  estante,
  idJogoEmFoco: idJogoEmFocoProp,
  idJogoSelecionado = null,
  aoFocarJogo,
  aoClicarJogo,
  aoClicarFundo,
}: PropsCenaDoArranjo) {
  const cena = mapear(arranjo, contexto, estante)
  const [idEmFocoLocal, setIdEmFocoLocal] = useState<string | null>(null)
  const idEmFoco = idJogoEmFocoProp !== undefined ? idJogoEmFocoProp : idEmFocoLocal

  const tratarEntradaFoco = (id: string) => {
    setIdEmFocoLocal(id)
    aoFocarJogo?.(id)
  }

  const tratarSaidaFoco = (id: string) => {
    setIdEmFocoLocal((atual) => (atual === id ? null : atual))
    aoFocarJogo?.(null)
  }

  return (
    <Canvas
      camera={{ position: [0, 1, 3] }}
      gl={{ preserveDrawingBuffer: true }}
      onPointerMissed={() => aoClicarFundo?.()}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />
      <OrbitControls makeDefault />

      {cena.prateleiras.map((prateleira) => (
        <mesh
          key={prateleira.idCompartimento}
          position={prateleira.posicaoXYZ}
          onClick={(e) => {
            e.stopPropagation()
            aoClicarFundo?.()
          }}
        >
          <boxGeometry args={prateleira.dimensoesXYZ as [number, number, number]} />
          <meshStandardMaterial color="#c9b48f" />
        </mesh>
      ))}

      {cena.objetos.map((objeto) => (
        <ObjetoDoJogo
          key={objeto.idJogo}
          objeto={objeto}
          label={contexto.jogosPorId.get(objeto.idJogo)?.nome ?? objeto.idJogo}
          emFoco={objeto.idJogo === idEmFoco}
          selecionado={objeto.idJogo === idJogoSelecionado}
          aoEntrar={() => tratarEntradaFoco(objeto.idJogo)}
          aoSair={() => tratarSaidaFoco(objeto.idJogo)}
          aoClicar={() => aoClicarJogo(objeto.idJogo)}
        />
      ))}

      {cena.naoAlocados.map((naoAlocado) => (
        <mesh
          key={naoAlocado.idJogo}
          position={naoAlocado.posicaoXYZ}
          onClick={(e) => {
            e.stopPropagation()
            aoClicarJogo(naoAlocado.idJogo)
          }}
          onPointerOver={() => tratarEntradaFoco(naoAlocado.idJogo)}
          onPointerOut={() => tratarSaidaFoco(naoAlocado.idJogo)}
        >
          <boxGeometry args={[0.04, 0.2, 0.2]} />
          <meshStandardMaterial
            color="#a8adb3"
            emissive={
              naoAlocado.idJogo === idJogoSelecionado
                ? '#f59e0b'
                : naoAlocado.idJogo === idEmFoco
                  ? '#3b82f6'
                  : '#000000'
            }
            emissiveIntensity={
              naoAlocado.idJogo === idJogoSelecionado
                ? 0.35
                : naoAlocado.idJogo === idEmFoco
                  ? 0.35
                  : 0
            }
          />
          {naoAlocado.idJogo === idJogoSelecionado && (
            <Outlines thickness={0.006} color="#f59e0b" />
          )}
        </mesh>
      ))}
    </Canvas>
  )
}

function ObjetoDoJogo({
  objeto,
  label,
  emFoco,
  selecionado,
  aoEntrar,
  aoSair,
  aoClicar,
}: {
  objeto: ObjetoNaCena
  label: string
  emFoco: boolean
  selecionado: boolean
  aoEntrar: () => void
  aoSair: () => void
  aoClicar: () => void
}) {
  return (
    <mesh
      position={objeto.posicaoXYZ}
      onPointerOver={(e) => {
        e.stopPropagation()
        aoEntrar()
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        aoSair()
      }}
      onClick={(e) => {
        e.stopPropagation()
        aoClicar()
      }}
    >
      <boxGeometry args={objeto.dimensoesXYZ as [number, number, number]} />
      <meshStandardMaterial
        color={objeto.cor}
        emissive={selecionado ? '#f59e0b' : emFoco ? '#3b82f6' : '#000000'}
        emissiveIntensity={selecionado ? 0.35 : emFoco ? 0.35 : 0}
      />
      {objeto.tracejado && <Edges color="#333" />}
      {selecionado && <Outlines thickness={0.006} color="#f59e0b" />}
      {emFoco && <Html center>{label}</Html>}
    </mesh>
  )
}
