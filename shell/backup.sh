#!/usr/bin/env bash

## 数据备份脚本
## 将基础数据、配置文件、脚本文件、依赖文件打包为 tgz 备份文件
## 用法: bash backup.sh [备份文件路径]
## 示例: bash backup.sh /tmp/ql_backup.tgz

dir_root=$QL_DIR
dir_data=$dir_root/data

if [[ ${QL_DATA_DIR:=} ]]; then
  dir_data="${QL_DATA_DIR%/}"
fi

# 备份输出路径，默认为 /tmp/ql_backup_<日期>.tgz
backup_file="${1:-/tmp/ql_backup_$(date +%Y%m%d_%H%M%S).tgz}"

# 要备份的目录（对应前端选项）
# base:    db, upload（基础数据，包含定时任务、环境变量、订阅等）
# config:  config（配置文件）
# scripts: scripts（脚本文件）
# deps:    deps（依赖文件）
backup_dirs=(
  db
  upload
  config
  scripts
  deps
)

echo -e "=====> 开始备份数据\n"
echo -e "数据目录: $dir_data"
echo -e "备份文件: $backup_file\n"

# 检查数据目录
if [[ ! -d "$dir_data" ]]; then
  echo -e "错误: 数据目录 $dir_data 不存在"
  exit 1
fi

# 检查要备份的目录是否存在
existing_dirs=()
for dir in "${backup_dirs[@]}"; do
  if [[ -d "$dir_data/$dir" ]]; then
    existing_dirs+=("data/$dir")
    echo -e "---> 发现 $dir"
  else
    echo -e "---> $dir 不存在，跳过"
  fi
done
echo

if [[ ${#existing_dirs[@]} -eq 0 ]]; then
  echo -e "错误: 没有找到任何可备份的目录"
  exit 1
fi

# 打包
echo -e "---> 正在打包..."
cd "$dir_data/.."
tar -zcf "$backup_file" "${existing_dirs[@]}"

if [[ $? -eq 0 ]]; then
  file_size=$(du -h "$backup_file" | cut -f1)
  echo -e "---> 打包完成\n"
  echo -e "=====> 备份成功"
  echo -e "文件: $backup_file"
  echo -e "大小: $file_size"
  echo -e "\n还原方式:"
  echo -e "  1. 通过面板: 系统设置 -> 数据备份 -> 还原数据"
  echo -e "  2. 通过命令: cd $dir_data/.. && tar -zxf $backup_file && ql reload data"
else
  echo -e "错误: 打包失败"
  exit 1
fi
