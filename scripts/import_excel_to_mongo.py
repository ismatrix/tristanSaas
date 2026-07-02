import pandas as pd
import numpy as np
import datetime
from pymongo import MongoClient

def clean_and_import(excel_path, sheet_name, collection_name, string_cols):
    print(f"开始处理: {excel_path} -> Sheet: {sheet_name}")
    # 强制以 object/str 方式读取指定的可能丢失精度的列
    dtype_dict = {col: str for col in string_cols}
    df = pd.read_excel(excel_path, sheet_name=sheet_name, dtype=dtype_dict)
    
    records = df.to_dict(orient='records')
    cleaned_records = []
    
    for row in records:
        cleaned_row = {}
        for col, val in row.items():
            # 跳过 Unnamed 列
            if str(col).startswith('Unnamed:'):
                continue
                
            # 处理 NaN/空值
            if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
                if col == 'parentGID':
                    cleaned_row[col] = ""  # 根节点判定
                else:
                    cleaned_row[col] = None
                continue
                
            # 处理时间类型
            if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
                try:
                    cleaned_row[col] = val.strftime('%Y-%m-%d')
                except Exception:
                    cleaned_row[col] = str(val)
                continue
                
            # 处理大数字段，转为纯字符串，并截断类似 123.0 的浮点数后缀
            if col in string_cols:
                val_str = str(val).strip()
                if '.' in val_str:
                    parts = val_str.split('.')
                    if len(parts) > 1 and (parts[1] == '0' or parts[1] == ''):
                        val_str = parts[0]
                cleaned_row[col] = val_str
            else:
                # 其他浮点数若没有小数部分则转为 int 存储
                if isinstance(val, float) and val.is_integer():
                    cleaned_row[col] = int(val)
                else:
                    cleaned_row[col] = val
                    
        cleaned_records.append(cleaned_row)
        
    # 连接本地 mongo 数据库进行写入
    client = MongoClient('mongodb://127.0.0.1:27017')
    db = client['node-boilerplate']
    
    print(f"正在覆盖导入到本地 MongoDB 集合: {collection_name} ...")
    db[collection_name].delete_many({}) # 清空旧数据
    if cleaned_records:
        result = db[collection_name].insert_many(cleaned_records)
        print(f"导入成功！共写入 {len(result.inserted_ids)} 条记录。")
    else:
        print("未发现任何记录，已完成清空。")
    print("-" * 50)

if __name__ == '__main__':
    # 1. 覆盖导入 keyGlobalFamilyTree
    clean_and_import(
        excel_path='/Users/tristan/Downloads/72颗客户树总表修订版（更新部分数据枚举值错误）-20260618.xlsx',
        sheet_name='出海企业客户树清单修订版',
        collection_name='keyGlobalFamilyTree',
        string_cols=['PID', 'GID', 'duns', 'ultimateGID', 'parentGID']
    )
    
    # 2. 覆盖导入 custContacts
    clean_and_import(
        excel_path='/Users/tristan/Downloads/客户树联系人表更新版-20260618.xlsx',
        sheet_name='客户联系人全表',
        collection_name='custContacts',
        string_cols=['ultimateGID', 'companyGId', 'duns', 'contactId', 'functionId']
    )
    
    # 3. 覆盖导入 keyFamilyTreeCustMapping
    clean_and_import(
        excel_path='/Users/tristan/Downloads/存量数据匹配更新版-0618交付.xlsx',
        sheet_name='1、客户树存量匹配',
        collection_name='keyFamilyTreeCustMapping',
        string_cols=['ultimateGID', 'GID', 'extCustId']
    )
