import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemaTypes/index.js'

export default defineConfig({
  name: 'default',
  title: 'Persica 3',

  projectId: 'mbgyqkdn',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            // Orderable drag-and-drop entry list
            orderableDocumentListDeskItem({type: 'entry', title: 'Entries', S, context}),
            S.divider(),
            // Singleton settings document
            S.listItem()
              .title('Site Settings')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
              ),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
