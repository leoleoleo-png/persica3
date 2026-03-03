import {defineType, defineField} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',

  // Prevent creating more than one settings document
  __experimental_actions: ['update', 'publish'],

  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      initialValue: 'PERSICA 3',
    }),

    defineField({
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
    }),

    defineField({
      name: 'bandcampUrl',
      title: 'Bandcamp URL',
      type: 'url',
    }),

    defineField({
      name: 'spotifyUrl',
      title: 'Spotify URL',
      type: 'url',
    }),

    defineField({
      name: 'heroMediaType',
      title: 'Hero Media Type',
      type: 'string',
      options: {
        list: [
          { title: 'None', value: 'none' },
          { title: 'Image', value: 'image' },
          { title: 'Video (MP4)', value: 'mp4' },
        ],
        layout: 'radio',
      },
      initialValue: 'none',
    }),

    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      hidden: ({ document }) => document?.heroMediaType !== 'image',
    }),

    defineField({
      name: 'heroVideoFile',
      title: 'Hero Video (MP4)',
      type: 'file',
      options: { accept: 'video/mp4,video/*' },
      hidden: ({ document }) => document?.heroMediaType !== 'mp4',
    }),
  ],
})
