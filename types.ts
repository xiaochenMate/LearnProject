
export type Category = 'education' | 'entertainment' | 'utilities';

export interface AppItem {
  id: string;
  title: string;
  author: string;
  category: Category;
  imageUrl: string;
  description: string;
  tags: string[];
  icon?: string; // 新增可选图标属性
}
