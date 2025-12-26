import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, message, Spin, Modal, Result } from 'antd';
import { ArrowLeftOutlined, GithubOutlined } from '@ant-design/icons';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { generateFix, createPR } from '../api/endpoints';
import { Issue, RepoInfo, AnalyzeResponse } from '../types';

const { Title, Paragraph, Text } = Typography;

const FixPreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. 获取 State，这里包含从 Dashboard 传来的原始数据(dashboardData)作为备份
  const state = location.state as { 
    issue: Issue; 
    fileContent: string; 
    repoInfo: RepoInfo;
    dashboardData: AnalyzeResponse;
  } | null;

  const { issue, fileContent, repoInfo, dashboardData } = state || {};

  const [fixedContent, setFixedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 增加对 repoInfo 的检查
    if (!issue || !fileContent || !repoInfo) {
        setLoading(false);
        return;
    }

    const fetchFix = async () => {
      try {
        // [修改这里]：按照新的参数顺序调用 generateFix
        // generateFix(owner, repo, filePath, originalContent, issueId)
        const res = await generateFix(
            repoInfo.owner,   // 仓库拥有者
            repoInfo.repo,    // 仓库名
            issue.file,       // 文件路径
            fileContent,      // 原始内容
            issue.id          // 问题ID
        );
        
        setFixedContent(res.fixed_content);
      } catch (error) {
        console.error(error);
        message.error('生成修复内容失败，请检查控制台网络请求详情');
      } finally {
        setLoading(false);
      }
    };

    fetchFix();
  }, [issue, fileContent, repoInfo]);

  const handleCreatePR = async () => {
    // 增加安全检查
    if (!issue || !repoInfo || !fixedContent) {
        message.error("缺少必要信息，无法提交PR");
        return;
    }

    setSubmitting(true);
    try {
        // [删除] 不需要前端生成 branchName 了
        // const branchName = `docs/fix-${issue.id}-${Date.now()}`;
        // [删除] 不需要构造 changes 对象了
        // const changes = { [issue.file]: fixedContent };
        
        // [修改] 直接调用更新后的 API，传入6个必要参数
        const res = await createPR(
            repoInfo.owner,           // target_owner
            repoInfo.repo,            // target_repo
            issue.file,               // file_path
            fixedContent,             // final_content
            `docs: fix ${issue.category} issue in ${issue.file}`, // commit_message
            `Docs: Fix ${issue.category} issues in ${issue.file}` // pr_title
        );
        
        Modal.success({
            title: 'PR 创建成功',
            content: (
                <div>
                    <p>已成功为您创建 Pull Request！</p>
                    <a href={res.pr_url} target="_blank" rel="noopener noreferrer">点击查看 PR</a>
                </div>
            ),
            // 成功后携带数据返回 Dashboard
            onOk: () => navigate('/dashboard', { state: { data: dashboardData } }),
        });
    } catch (error) {
        console.error(error);
        message.error('创建 PR 失败，请检查是否已登录或稍后重试');
    } finally {
        setSubmitting(false);
    }
  };

  // 4. 处理页面刷新导致的数据丢失情况
  if (!issue || !fileContent || !repoInfo) {
      return (
          <Result
            status="500"
            title="会话已过期"
            subTitle="无法获取修复上下文（可能是因为刷新了页面）。请返回仪表盘重新选择修复。"
            extra={
                <Button type="primary" onClick={() => navigate('/')}>
                    回到首页
                </Button>
            }
          />
      );
  }

  if (loading) {
      return (
          <div style={{ textAlign: 'center', padding: '100px' }}>
              <Spin size="large" tip="正在生成修复方案..." />
          </div>
      );
  }

  return (
    <div className="fade-in">
      {/* 5. 返回按钮使用 navigate(-1) 以利用浏览器历史记录，无损返回上一页 */}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        返回报告
      </Button>

      <Card title={`修复预览: ${issue.file}`} extra={
          <Button type="primary" icon={<GithubOutlined />} loading={submitting} onClick={handleCreatePR}>
              提交 PR
          </Button>
      }>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Paragraph>
                针对问题 <Text code>{issue.description}</Text> 的自动修复建议。
            </Paragraph>
        </Space>
        
        <div style={{ maxHeight: '600px', overflow: 'auto', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
            {/* 展示 Diff: oldValue 是原始内容, newValue 是 API 返回的修复内容 */}
            <ReactDiffViewer 
                oldValue={fileContent} 
                newValue={fixedContent} 
                splitView={true}
                compareMethod={DiffMethod.WORDS}
                leftTitle="当前内容"
                rightTitle="修复后内容"
            />
        </div>
      </Card>
    </div>
  );
};

export default FixPreview;