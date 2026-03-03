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
  ],
})
