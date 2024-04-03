import type { PropType } from 'vue';
import { FileBasicColumn } from './typing';
import { FileResultVO } from '/@/api/lamp/file/model/uploadModel';

export const basicProps = {
  // 提示消息
  helpText: {
    type: String as PropType<string>,
    default: '',
  },
  // 文件最大多少MB
  maxSize: {
    type: Number as PropType<number>,
    default: 2,
  },
  // 最大数量的文件，Infinity不限制
  maxNumber: {
    type: Number as PropType<number>,
    default: Infinity,
  },
  // 根据后缀，或者其他
  accept: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  // 是否支持上传多个文件
  multiple: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  // 上传参数
  uploadParams: {
    type: Object as PropType<any>,
    default: () => ({}),
  },
  api: {
    type: Function as PropType<PromiseFn>,
    default: null,
    required: false,
  },
  // 后台接口 接收文件的参数名
  name: {
    type: String as PropType<string>,
    default: 'file',
  },
  filename: {
    type: String as PropType<string>,
    default: null,
  },
};

export const uploadContainerProps = {
  value: {
    type: Array as PropType<FileResultVO[]>,
    default: () => [],
  },
  ...basicProps,
  showPreviewNumber: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  showPreviewButton: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  emptyHidePreview: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
};

export const previewProps = {
  value: {
    type: Array as PropType<FileResultVO[]>,
    default: () => [],
  },
};

export const fileListProps = {
  columns: {
    type: Array as PropType<FileBasicColumn[]>,
    default: null,
  },
  actionColumn: {
    type: Object as PropType<FileBasicColumn>,
    default: null,
  },
  dataSource: {
    type: Array as PropType<any[]>,
    default: null,
  },
};
