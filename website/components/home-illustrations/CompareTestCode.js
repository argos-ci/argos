import { x } from '@xstyled/styled-components'
import {
  CodeEditor,
  CodeEditorBody,
  CodeEditorHeader,
  CodeEditorTab,
} from '../CodeEditor'
import { Versus } from '../Versus'

const oldCode = `it('should list car details', () => {
  cy.get('h1')
    .contains('Lamborghini Aventador')

  cy.get('div.color')
    .contains('Verde Mantis')

  cy.get('div.priceTag')
    .contains('$$$')
    
  cy.get('div.seller-name')
    .contains('Georges Abitbol')
  ...
})
`

const newCode = `it('should list car details', () => {
  cy.argosScreenshot('details_page')
})
`

export const CompareTestCode = (props) => (
  <x.div
    display="flex"
    gap={4}
    justifyContent="space-between"
    alignItems={{ _: 'center', md: 'flex-start' }}
    flexDirection={{ _: 'column', md: 'row' }}
    mt={8}
    {...props}
  >
    <CodeEditor flex={{ _: 'column', md: 1 }} w={1} h="auto">
      <CodeEditorHeader>
        <CodeEditorTab active="true">details-page-old.test.js</CodeEditorTab>
      </CodeEditorHeader>
      <CodeEditorBody h="370px">{oldCode}</CodeEditorBody>
    </CodeEditor>
    <x.div as={Versus} w="100px" my="20px" color="white" />
    <CodeEditor flex={{ _: 'auto', md: 1 }} w={1} h="160px">
      <CodeEditorHeader>
        <CodeEditorTab active="true">details-page.test.js</CodeEditorTab>
      </CodeEditorHeader>
      <CodeEditorBody>{newCode}</CodeEditorBody>
    </CodeEditor>
  </x.div>
)
