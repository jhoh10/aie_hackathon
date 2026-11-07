import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelFromEnv } from './model.ts';

test('no key falls back to saved answers', () => assert.equal(modelFromEnv({}).name, 'files'));
test('META_API_KEY selects Muse Spark by default', () => assert.equal(modelFromEnv({ META_API_KEY: 'x' }).name, 'muse-spark-1.3'));
test('MODEL_NAME overrides the model', () => assert.equal(modelFromEnv({ MODEL_API_KEY: 'x', MODEL_NAME: 'muse-spark-1.2' }).name, 'muse-spark-1.2'));
test('empty values from .env.example keep the defaults', () => assert.equal(modelFromEnv({ META_API_KEY: 'x', MODEL_NAME: '', MODEL_BASE_URL: '' }).name, 'muse-spark-1.3'));
test('MODEL=files forces saved answers', () => assert.equal(modelFromEnv({ META_API_KEY: 'x', MODEL: 'files' }).name, 'files'));
