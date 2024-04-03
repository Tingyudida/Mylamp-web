<template>
  <BasicModal
    :keyboard="true"
    :maskClosable="false"
    :min-height="300"
    okText="切换"
    title="切换机构"
    v-bind="$attrs"
    width="40%"
    @ok="handleSubmit"
    @register="registerModal"
  >
    <Form
      ref="formRef"
      :label-col="{ style: { width: '80px' } }"
      :model="formData"
      class="p-4 enter-x"
    >
      <FormItem label="单位" name="currentCompanyId">
        <RadioGroup v-model:value="formData.orgId">
          <RadioButton v-for="org in formState.orgList" :key="org.id" :value="org.id">
            {{ getOrgName(org) }}
          </RadioButton>
        </RadioGroup>
      </FormItem>
    </Form>
    <Alert message="注意事项">
      <template #description>
        <p>
          1.【用户】：即账号，任何人在本平台都有一个唯一的用户数据，可理解为账号，通过手机号、身份证、登录账号等唯一信息来确定唯一性
        </p>
        <p> 2.【员工】：存放用户的具体业务字段。 </p>
        <p>
          3.
          【单位】："员工"在某个"企业"下可以属于多个单位或部门；若给员工分配组织机构信息时，只为其分配了"部门"，这里会显示出该"部门"的上级单位。
        </p>
        <p> 4. 【部门】：部门必须挂在单位下，请勿将部门挂在根节点。 </p>
      </template>
    </Alert>
  </BasicModal>
</template>
<script lang="ts">
  import { defineComponent, reactive } from 'vue';
  import { Alert, Form, Radio, RadioGroup } from 'ant-design-vue';
  import { BasicModal, useModalInner } from '/@/components/Modal';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { useUserStore } from '/@/store/modules/user';
  import { findCompanyDept } from '/@/api/lamp/common/oauth';
  import { BaseOrgResultVO } from '/@/api/basic/user/model/baseOrgModel';
  import { ORG_TYPE_MAP } from '/@/enums/biz/base';

  export default defineComponent({
    name: 'SwitchCompany',
    components: {
      BasicModal,
      Form,
      FormItem: Form.Item,
      RadioButton: Radio.Button,
      RadioGroup,
      Alert,
    },
    emits: ['success', 'register'],
    setup(_, { emit }) {
      const { createMessage, createConfirm } = useMessage();
      const userStore = useUserStore();

      const formData = reactive({
        orgId: null,
      });
      const formState = reactive({
        orgList: [] as BaseOrgResultVO[],
        // 所属单位id
        currentCompanyId: '',
        // 所属部门id
        currentDeptId: '',
      });

      const [registerModal, { setModalProps, closeModal }] = useModalInner(async () => {
        setModalProps({ confirmLoading: false });

        formData.orgId = null;
        await loadOrg();
      });

      async function loadOrg() {
        const org = await findCompanyDept();
        formState.currentCompanyId = org.currentCompanyId;
        formState.currentDeptId = org.currentDeptId;
        formState.orgList = org.orgList;
      }

      function switchCompanyConfirm() {
        createConfirm({
          iconType: 'warning',
          content: `是否确认切换机构？`,
          onOk: async () => {
            try {
              await switchCompany();
            } catch (e) {}
          },
        });
      }

      function getOrgName(org: BaseOrgResultVO) {
        let name = `[${ORG_TYPE_MAP.get(org.type)}] `;

        name += org.name;
        if (
          (formState.currentDeptId !== null && formState.currentDeptId === org.id) ||
          (formState.currentDeptId === null && formState.currentCompanyId === org.id)
        ) {
          name += '(当前)';
        }
        return name;
      }


      async function switchCompany() {
        const userInfo = await userStore.switchTenantAndOrg(formData.orgId as unknown as string);
        if (userInfo) {
          createMessage.success('切换成功');
        }
      }

      async function handleSubmit() {
        try {
          setModalProps({ confirmLoading: true });
          switchCompanyConfirm();
          emit('success');
          closeModal();
        } finally {
          setModalProps({ confirmLoading: false });
        }
      }

      return {
        registerModal,
        formData,
        formState,
        handleSubmit,
        getOrgName,
      };
    },
  });
</script>
