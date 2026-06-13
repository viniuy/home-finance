import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'mikaypaylater.vercel.app',
      lastModified: new Date(),
    },
    {
      url: 'mikaypaylater.vercel.app/dashboard',
      lastModified: new Date(),
    },
  ]
}