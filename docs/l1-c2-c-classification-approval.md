# L1-C2-C 主分类批准

维护者批准了 140 条旧站站点的主分类。关系记录在 `content/curation/site-categories.json`，以旧站数字 ID 为键。

| 已批准批次 | 数量 | 主分类依据 |
| --- | ---: | --- |
| A1 | 80 | L1-C2-A 原主分类建议 |
| A2-M | 32 | L1-C2-A 原主分类建议及 L1-C2-B 历史组核对 |
| A2-S | 12 | L1-C2-A 原主分类建议 |
| B-C | 16 | L1-C2-B 补证后的主分类建议 |
| 合计 | 140 |  |

固定分类 Code 为 `community`、`gallery`、`literature`、`resources`、`marketplace`、`knowledge`、`gaming`、`events`。

每条关系包含一个主分类，补充分类最多两个且须互不重复并区别于主分类。本轮批准范围仅覆盖主分类，140 条关系的 `secondary` 均为空数组。

## 待审范围

| 待审批次 | 数量 |
| --- | ---: |
| A2-P、A2-G、A2-E、A2-N | 17 |
| B-P | 17 |
| B-I（含 5 条历史分级冲突） | 23 |
| C（历史成人标记） | 28 |
| 合计 | 85 |

待审记录保留原有历史 ID 和独立审阅身份。

## 发布边界

分类、公开页面资格和外部访问地址须独立批准。后续静态生成以独立的公开资格数据决定可见性。分类映射中的关系只供分类使用，公开详情、首页精选和 Sitemap 需要各自的发布依据。外部入口以独立核准的地址为准。

## 审计依据

以下路径相对于仓库根目录。

- `.local/l1-c2-a/candidates.ndjson` 保存历史身份、内容标记和原分类建议。
- `.local/l1-c2-a/review-sfw.md`、`.local/l1-c2-a/review-adult.md` 为两个独立审阅清单。
- `.local/l1-c2-a/exceptions.md` 汇总历史异常及软删排除证据。
- `.local/l1-c2-b/review-ids.md` 给出批准与待审批次的原始 ID 清单。
- `.local/l1-c2-b/review-closure.md` 给出 B-C 逐条补证后的主分类建议。
