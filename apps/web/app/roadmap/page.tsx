"use client";

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function RoadmapPage() {
  const [selectedMonth, setSelectedMonth] = useState<1 | 2 | 3>(3);

  useEffect(() => {
    document.title = "CAPlayground - 路线图";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="container mx-auto px-3 min-[600px]:px-4 lg:px-6 py-16 md:py-24">
        <header className="mb-10 space-y-2">
                          <h1 className="font-heading text-4xl md:text-5xl font-bold">项目路线图</h1>          <p className="text-muted-foreground">CAPlayground中有什么新动态？（最后更新：2025年11月17日）</p>
          <div className="flex gap-2 pt-4">
            <Button
              variant={selectedMonth === 1 ? "default" : "outline"}
              onClick={() => setSelectedMonth(1)}
            >
              第一个月
            </Button>
            <Button
              variant={selectedMonth === 2 ? "default" : "outline"}
              onClick={() => setSelectedMonth(2)}
            >
              第二个月
            </Button>
            <Button
              variant={selectedMonth === 3 ? "default" : "outline"}
              onClick={() => setSelectedMonth(3)}
            >
              第三个月
            </Button>
          </div>
        </header>

        {/* Status Badges
          <Badge className="align-middle mr-1">Done</Badge>
          <Badge variant="secondary" className="align-middle mx-1">In Progress</Badge>
          <Badge variant="outline" className="align-middle mx-1">Not Started</Badge>
        */}

        {selectedMonth === 1 && (
          <div className="space-y-6">
            <RoadmapItem index={1} title="项目启动" status={<Badge>已完成：2025年8月24日</Badge>}>
              于2025年8月24日启动项目，因为Lemin说该举办第二次壁纸竞赛了。创建项目。
            </RoadmapItem>
            <RoadmapItem index={2} title="项目和基础编辑器" status={<Badge>已完成：2025年8月24日</Badge>}>
              项目页面、基础编辑器和创建.ca文件。
            </RoadmapItem>
            <RoadmapItem index={3} title="查看和编辑图层" status={<Badge>已完成：2025年9月5日</Badge>}>
              查看和编辑Core Animation文件的图层。导出.ca文件。
            </RoadmapItem>
            <RoadmapItem index={4} title="Core Animation图层属性" status={<Badge>已完成：2025年9月5日</Badge>}>
              调整图层的位置、边界、不透明度、旋转等。
            </RoadmapItem>
            <RoadmapItem index={5} title="创建动画、查看和编辑状态" status={<Badge>已完成：2025年9月22日</Badge>}>
              创建状态转换和关键帧动画。
            </RoadmapItem>
            <RoadmapItem index={6} title="CAPlayground应用" status={<Badge variant="secondary" className="align-middle mx-1">已跳过</Badge>}>
              CAPlayground应用在应用内部工作。
            </RoadmapItem>
          </div>
        )}
        {selectedMonth === 2 && (
          <div className="space-y-6">
            <RoadmapItem index={1} title="移动编辑器" status={<Badge>已完成：2025年10月4日</Badge>}>
              在移动设备上编辑壁纸，如您的iPhone或iPad。
            </RoadmapItem>
            <RoadmapItem index={2} title="壁纸画廊" status={<Badge>已完成：2025年10月5日</Badge>}>
              壁纸画廊展示您的壁纸并浏览CAPlayground社区的壁纸。
            </RoadmapItem>
            <RoadmapItem index={3} title="渐变图层" status={<Badge>已完成：2025年10月7日</Badge>}>
              使用径向、轴向和圆锥模式创建渐变。
            </RoadmapItem>
            <RoadmapItem index={4} title="云端项目" status={<Badge>已完成：2025年10月18日</Badge>}>
              将您的项目同步到Google云端硬盘，以便在多台设备上访问项目。
            </RoadmapItem>
            <RoadmapItem index={5} title="发射器支持" status={<Badge>已完成：2025年10月24日</Badge>}>
              创建发射器图层和单元格以发射粒子。
            </RoadmapItem>
            <RoadmapItem index={6} title="视差效果（测试版）" status={<Badge>已完成：2025年10月28日</Badge>}>
              为iOS 26创建带有视差效果（陀螺仪）的壁纸。需要支持子图层来实现此功能。
            </RoadmapItem>
          </div>
        )}
        {selectedMonth === 3 && (
          <div className="space-y-6">
            <RoadmapItem index={1} title="复制器图层" status={<Badge>已完成：2025年11月3日</Badge>}>
              创建复制器图层以按模式复制和排列图层。
            </RoadmapItem>
            <RoadmapItem index={2} title="混合模式" status={<Badge>已完成：2025年11月12日</Badge>}>
              在2个或更多图层之间创建混合效果，如变暗、变亮等。
            </RoadmapItem>
            <RoadmapItem index={3} title="滤镜" status={<Badge>已完成：2025年11月12日</Badge>}>
              为图层添加滤镜效果，如高斯模糊、对比度等。
            </RoadmapItem>
            <RoadmapItem index={4} title="同步视频与状态" status={<Badge>已完成：2025年11月17日</Badge>}>
              同步视频与状态转换，使视频在某个状态开始并在另一个状态结束。
            </RoadmapItem>
            <RoadmapItem index={5} title="性能改进" status={<Badge variant="secondary" className="align-middle mx-1">进行中</Badge>}>
              修复错误，改进性能，通过优化设置减少设备上的崩溃和卡顿。
            </RoadmapItem>
          </div>
        )}
      </section>
      </main>
      <Footer />
    </div>
  )
}


function RoadmapItem({
  index,
  title,
  status,
  children,
}: {
  index: number
  title: string
  status: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <article className="rounded-xl border border-border bg-card text-card-foreground p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-semibold"
          >
            {index}
          </span>
          <h2 className="font-heading text-xl md:text-2xl font-semibold">{title}</h2>
        </div>
        <div aria-label="status" className="mt-2 md:mt-0 md:shrink-0">
          {status}
        </div>
      </div>
      {children ? <p className="mt-3 text-sm md:text-base text-muted-foreground">{children}</p> : null}
    </article>
  )
}
