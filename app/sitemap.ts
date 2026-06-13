import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mikaypaylater.vercel.app',
      lastModified: new Date(),
    },
    {
      url: 'https://mikaypaylater.vercel.app/dashboard',
      lastModified: new Date(),
    },
  ]
}