import slugifyFn from 'slugify';

export function slugify(str: string) {
  return slugifyFn(str, { lower: true, strict: true, trim: true });
}
