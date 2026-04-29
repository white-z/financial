import type { Metadata } from "next";
import { OkxClientPage } from "./OkxClientPage";

export const metadata: Metadata = {
  title: "OKX 合约复盘室",
  description: "基于 OKX 历史仓位导出，分析净盈亏、回撤、杠杆偏好与币种排名。",
};

export default function OkxPage() {
  return <OkxClientPage />;
}
