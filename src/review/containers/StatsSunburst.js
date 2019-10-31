import React from 'react'
import styled from '@xstyled/styled-components'
import { th } from '@xstyled/system'
import { Sunburst } from 'react-vis'
import useDimensions from 'react-use-dimensions'
import { FileSize } from 'components'

function getChild(arr, name) {
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i].name === name) {
      return arr[i]
    }
  }
  return null
}

function getFile(module, fileName, parentTree) {
  const charIndex = fileName.indexOf('/')

  if (charIndex !== -1) {
    let folder = fileName.slice(0, charIndex)
    if (folder === '~') {
      folder = 'node_modules'
    }

    let childFolder = getChild(parentTree.children, folder)
    if (!childFolder) {
      childFolder = {
        name: folder,
        children: [],
      }
      parentTree.children.push(childFolder)
    }

    getFile(module, fileName.slice(charIndex + 1), childFolder)
  } else {
    module.name = fileName
    parentTree.children.push(module)
  }
}

function getFullName(name) {
  const nodeModulesIndex = name.indexOf('/node_modules/')
  if (nodeModulesIndex === -1) return name
  return name.slice(nodeModulesIndex + 1, name.length)
}

function buildHierarchy(modules) {
  let maxDepth = 1

  const root = {
    children: [],
    name: 'root',
  }

  modules.forEach(function addToTree(module) {
    // remove this module if either:
    // - index is null
    // - issued by extract-text-plugin
    const extractInIdentifier =
      module.identifier.indexOf('extract-text-webpack-plugin') !== -1
    const extractInIssuer =
      module.issuer &&
      module.issuer.indexOf('extract-text-webpack-plugin') !== -1
    if (extractInIdentifier || extractInIssuer || module.index === null) {
      return
    }

    const mod = {
      id: module.id,
      fullName: getFullName(module.name),
      size: module.size,
      reasons: module.reasons,
    }

    const depth = mod.fullName.split('/').length - 1
    if (depth > maxDepth) {
      maxDepth = depth
    }

    let fileName = mod.fullName

    const beginning = mod.fullName.slice(0, 2)
    if (beginning === './') {
      fileName = fileName.slice(2)
    }

    getFile(mod, fileName, root)
  })

  root.maxDepth = maxDepth

  return root
}

function statsToData(stats) {
  return buildHierarchy(stats.modules)
}

const LabelContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: darker;
  text-align: center;
`

function getNodeSize(node) {
  return (node.children || []).reduce(
    (size, node) => size + getNodeSize(node),
    node.size || 0,
  )
}

function Label({ node }) {
  const size = getNodeSize(node)
  return (
    <LabelContainer>
      <div>
        <strong>{node.name}</strong>
      </div>
      <div>
        <FileSize>{size}</FileSize>
      </div>
    </LabelContainer>
  )
}

const colors = {
  file: '#db7100',
  default: '#487ea4',
}

export function getColor(node) {
  const { name } = node
  const dotIndex = name.indexOf('.')

  if (dotIndex !== -1 && dotIndex !== 0 && dotIndex !== name.length - 1) {
    return colors.file
  }
  if (node.parent && node.parent.data.name === 'node_modules') {
    return '#599e59'
  }

  return colors[name] || colors.default
}

const Container = styled.box`
  position: relative;
  margin: 0 auto;

  .rv-sunburst__series--radial__arc {
    stroke: ${th.color('gray800')} !important;
    stroke-opacity: 1;
    stroke-width: 1;
    transition: base;
    transition-property: opacity;
    cursor: pointer;

    &:hover {
      opacity: 0.5 !important;
    }
  }
`

const MemoSunburst = React.memo(props => <Sunburst {...props} />)

export function StatsSunburst({ stats }) {
  const data = React.useMemo(() => statsToData(stats), [stats])
  const [activeNode, setActiveNode] = React.useState(data)
  const handleMouseOver = React.useCallback(node => setActiveNode(node), [])
  const handleMouseOut = React.useCallback(() => setActiveNode(data), [data])
  const [ref, { width, height }] = useDimensions()
  return (
    <Container ref={ref} height={width}>
      {width && height ? (
        <>
          <MemoSunburst
            hideRootNode
            colorType="literal"
            data={data}
            height={height}
            width={width}
            getColor={getColor}
            onValueMouseOver={handleMouseOver}
            onValueMouseOut={handleMouseOut}
          />
          {activeNode ? <Label node={activeNode} /> : null}
        </>
      ) : null}
    </Container>
  )
}
