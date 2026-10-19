/**
 * Inside a collection, show `abc` for its tag `<collection>:abc`. The bare
 * collection tag and tags from other collections keep their full name.
 */
export const collectionTagLabel = (tag: string, collection: string) => {
  const prefix = `${collection}:`

  return tag.length > prefix.length &&
    tag.toLowerCase().startsWith(prefix.toLowerCase())
    ? tag.slice(prefix.length)
    : tag
}
