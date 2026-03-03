import {defineType, defineField} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'

export const entry = defineType({
  name: 'entry',
  title: 'Entry',
  type: 'document',
  orderings: [orderRankOrdering],

  fields: [
    orderRankField({type: 'entry'}),

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 6,
    }),

    defineField({
      name: 'credits',
      title: 'Credits',
      type: 'string',
    }),

    defineField({
      name: 'mediaType',
      title: 'Media',
      type: 'string',
      initialValue: 'none',
      options: {
        list: [
          {title: 'None',       value: 'none'},
          {title: 'Image',      value: 'image'},
          {title: 'Video link (YouTube / Vimeo)', value: 'videolink'},
          {title: 'MP4 file',   value: 'mp4'},
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      hidden: ({document}) => document?.mediaType !== 'image',
    }),

    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'YouTube or Vimeo link',
      hidden: ({document}) => document?.mediaType !== 'videolink',
    }),

    defineField({
      name: 'videoFile',
      title: 'MP4 File',
      type: 'file',
      options: {accept: 'video/mp4,video/*'},
      hidden: ({document}) => document?.mediaType !== 'mp4',
    }),

    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      media: 'image',
    },
    prepare({title, media}) {
      return {
        title: title || '(untitled)',
        media,
      }
    },
  },
})
