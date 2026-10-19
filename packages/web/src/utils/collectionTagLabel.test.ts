import { describe, expect, it } from 'vitest'

import { collectionTagLabel } from './collectionTagLabel'

describe('collectionTagLabel', () => {
  it('drops the collection prefix', () => {
    expect(collectionTagLabel('test:abc', 'test')).toEqual('abc')
    expect(collectionTagLabel('Test:abc', 'test')).toEqual('abc')
    expect(collectionTagLabel('test:a:b', 'test')).toEqual('a:b')
  })

  it('keeps tags that do not belong to the collection as they are', () => {
    expect(collectionTagLabel('test', 'test')).toEqual('test')
    expect(collectionTagLabel('test:', 'test')).toEqual('test:')
    expect(collectionTagLabel('testing:abc', 'test')).toEqual('testing:abc')
  })
})
