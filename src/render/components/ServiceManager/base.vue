<template>
  <el-card class="version-manager">
    <template #header>
      <div class="card-header">
        <div class="left">
          <span> {{ title }} </span>
          <el-popover :show-after="600" placement="top" width="auto">
            <template #default>
              <span>{{ I18nT('base.customVersionDir') }}</span>
            </template>
            <template #reference>
              <el-button
                class="custom-folder-add-btn"
                :icon="FolderAdd"
                link
                @click.stop="showCustomDir"
              ></el-button>
            </template>
          </el-popover>
        </div>
        <el-button class="button" :disabled="fetching" link @click="resetData">
          <yb-icon
            :svg="import('@/svg/icon_refresh.svg?raw')"
            class="refresh-icon"
            :class="{ 'fa-spin': fetching }"
          ></yb-icon>
        </el-button>
      </div>
    </template>
    <el-table v-loading="fetching" class="service-table" :data="versions">
      <el-table-column prop="version" width="140px">
        <template #header>
          <span style="padding: 2px 12px 2px 24px; display: block">{{
            I18nT('base.version')
          }}</span>
        </template>
        <template #default="scope">
          <span
            style="padding: 2px 12px 2px 24px; display: block"
            :class="{
              current: isInAppEnv(scope.row)
            }"
            >{{ scope.row.version }}</span
          >
        </template>
      </el-table-column>
      <el-table-column :label="I18nT('base.path')" :prop="null">
        <template #default="scope">
          <template v-if="!scope.row.version">
            <el-popover popper-class="version-error-tips" width="auto" placement="top">
              <template #reference>
                <span class="path error" @click.stop="openDir(scope.row.path)">{{
                  scope.row.path
                }}</span>
              </template>
              <template #default>
                <span>{{ scope.row?.error ?? I18nT('base.failedFetchingVersionHint') }}</span>
              </template>
            </el-popover>
          </template>
          <template v-else>
            <span
              class="path"
              :class="{
                current: isInAppEnv(scope.row)
              }"
              @click.stop="openDir(scope.row.path)"
              >{{ scope.row.path }}</span
            >
          </template>
        </template>
      </el-table-column>
      <el-table-column :label="I18nT('service.env')" :prop="null" width="100px" align="center">
        <template #header>
          <el-tooltip :content="I18nT('service.envTips')" placement="top" :show-after="600">
            <span>{{ I18nT('service.env') }}</span>
          </el-tooltip>
        </template>
        <template #default="scope">
          <template v-if="ServiceActionStore.pathSeting[scope.row.bin]">
            <el-button style="width: auto; height: auto" text :loading="true"></el-button>
          </template>
          <template v-else-if="isInAppEnv(scope.row)">
            <el-tooltip :content="I18nT('service.setByApp')" :show-after="600" placement="top">
              <el-button
                link
                type="primary"
                @click.stop="ServiceActionStore.updatePath(scope.row, typeFlag)"
              >
                <yb-icon :svg="import('@/svg/select.svg?raw')" width="17" height="17" />
              </el-button>
            </el-tooltip>
          </template>
          <template v-else-if="isInEnv(scope.row)">
            <el-tooltip :content="I18nT('service.setByNoApp')" :show-after="600" placement="top">
              <el-button
                link
                type="warning"
                @click.stop="ServiceActionStore.updatePath(scope.row, typeFlag)"
              >
                <yb-icon :svg="import('@/svg/select.svg?raw')" width="17" height="17" />
              </el-button>
            </el-tooltip>
          </template>
          <template v-else>
            <el-button
              class="current-set row-hover-show"
              link
              @click.stop="ServiceActionStore.updatePath(scope.row, typeFlag)"
            >
              <yb-icon
                class="current-not"
                :svg="import('@/svg/select.svg?raw')"
                width="17"
                height="17"
              />
            </el-button>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        :show-overflow-tooltip="true"
        :label="I18nT('service.alias')"
        :prop="null"
        width="120px"
        align="left"
      >
        <template #header>
          <el-tooltip :content="I18nT('service.aliasTips')" placement="top" :show-after="600">
            <span>{{ I18nT('service.alias') }}</span>
          </el-tooltip>
        </template>
        <template #default="scope">
          <div class="flex items-center h-full min-h-9"
            ><span class="truncate">{{
              appStore.config.setup.alias?.[scope.row.bin]?.map((a) => a.name)?.join(',')
            }}</span></div
          >
        </template>
      </el-table-column>
      <el-table-column :label="I18nT('base.action')" :prop="null" width="100px" align="center">
        <template #default="scope">
          <EXT :item="scope.row" :type="typeFlag">
            <template #default>
              <slot name="operation" :row="scope.row as SoftInstalled"></slot>
            </template>
          </EXT>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script lang="ts" setup>
  import { FolderAdd } from '@element-plus/icons-vue'
  import { ServiceActionStore } from '@/components/ServiceManager/EXT/store'
  import { I18nT } from '@lang/index'
  import type { AllAppModule } from '@/core/type'
  import { Setup } from '@/components/ServiceManager/setup'
  import EXT from '@/components/ServiceManager/EXT/index.vue'
  import type { SoftInstalled } from '@shared/app'

  const props = defineProps<{
    typeFlag: AllAppModule
    title: string
    fetchDataWhenCreate?: boolean
  }>()

  const {
    appStore,
    versions,
    isInEnv,
    isInAppEnv,
    openDir,
    showCustomDir,
    resetData,
    fetchData,
    fetching
  } = Setup(props.typeFlag)

  if (props?.fetchDataWhenCreate) {
    fetchData()
  }
</script>
