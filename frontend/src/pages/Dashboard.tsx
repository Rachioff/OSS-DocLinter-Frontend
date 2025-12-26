import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// 1. 添加 message 到引用列表
import { Card, Row, Col, Statistic, List, Tag, Button, Typography, Progress, Alert, Space, Tooltip, message } from 'antd';
import { CheckCircleOutlined, WarningOutlined, BugOutlined, ToolOutlined, ArrowLeftOutlined, FileTextOutlined, GithubOutlined } from '@ant-design/icons';
import { AnalyzeResponse, Issue } from '../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // 获取 /analyze 接口返回的完整数据
  const data = location.state?.data as AnalyzeResponse;

  if (!data) {
    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <Alert
                message="无数据"
                description="请先在首页输入 URL 进行分析"
                type="warning"
                showIcon
                action={
                    <Button type="primary" onClick={() => navigate('/')}>
                        返回首页
                    </Button>
                }
                style={{ maxWidth: '500px', margin: '0 auto' }}
            />
        </div>
    );
  }

  // 解构出 files (这里面包含了 README.md 等文件的原始内容字符串)
  const { report, repo_info, files } = data;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const handleFix = (issue: Issue) => {
    // 1. 获取所有文件条目
    // 这里的类型断言 'any' 是为了临时解决类型不匹配的问题
    // 因为实际数据结构是 { path: string, content: string }，而前端可能定义成了 string
    const fileEntries = Object.values(files) as any[];

    // 2. 在文件列表中查找匹配 path 的项
    // 我们寻找哪个文件的 .path 属性等于 issue.file (例如 "README.md")
    const targetFile = fileEntries.find(f => f && f.path === issue.file);

    // 3. 提取内容
    const content = targetFile ? targetFile.content : null;

    if (!content) {
        console.error('无法找到文件内容。');
        console.log('正在寻找:', issue.file);
        console.log('可用文件路径:', fileEntries.map(f => f.path));
        
        message.error(`未找到文件 ${issue.file} 的原始内容，请检查后端返回数据`);
        return;
    }

    // 4. 跳转
    // 注意：这里我们把 dashboardData 传过去，用于返回时恢复状态
    navigate('/fix', { 
      state: { 
        issue, 
        fileContent: content, 
        repoInfo: repo_info,
        dashboardData: data 
      } 
    });
  };

  const scoreColor = report.overall_score >= 80 ? '#52c41a' : report.overall_score >= 60 ? '#faad14' : '#ff4d4f';

  return (
    <div className="fade-in">
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
        返回首页
      </Button>
      
      <Row gutter={[24, 24]}>
        {/* Header Card */}
        <Col span={24}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Space align="start">
                    <GithubOutlined style={{ fontSize: '32px', color: '#333' }} />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                        <a href={repo_info.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                            {repo_info.owner} / {repo_info.repo}
                        </a>
                        </Title>
                        <Space>
                            <Tag icon={<FileTextOutlined />}>分支: {repo_info.default_branch}</Tag>
                            <Text type="secondary">分析时间: {new Date(report.timestamp).toLocaleString()}</Text>
                        </Space>
                    </div>
                </Space>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                  <Space size="large" align="center">
                    <Statistic 
                        title="发现问题" 
                        value={report.issues.length} 
                        prefix={<BugOutlined />} 
                    />
                    <div style={{ textAlign: 'center' }}>
                        <Progress 
                            type="circle" 
                            percent={report.overall_score} 
                            width={80} 
                            strokeColor={scoreColor}
                            format={percent => <span style={{ color: scoreColor, fontSize: '18px' }}>{percent}分</span>}
                        />
                    </div>
                  </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Issues List */}
        <Col span={24}>
          <Card 
            title={<Title level={4} style={{ margin: 0 }}><WarningOutlined /> 详细分析报告</Title>}
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <List
              itemLayout="vertical"
              dataSource={report.issues}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  style={{ 
                      padding: '20px', 
                      marginBottom: '16px', 
                      border: '1px solid #f0f0f0', 
                      borderRadius: '8px',
                      background: '#fafafa'
                  }}
                  actions={[
                    <Button type="primary" icon={<ToolOutlined />} onClick={() => handleFix(item)}>
                      生成修复方案
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                        item.category === 'completeness' ? 
                        <Tooltip title="完整性问题"><CheckCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} /></Tooltip> : 
                        <Tooltip title="规范性问题"><BugOutlined style={{ fontSize: '24px', color: '#1890ff' }} /></Tooltip>
                    }
                    title={
                      <Space wrap>
                        <Text strong style={{ fontSize: '16px' }}>{item.description}</Text>
                        <Tag color={getSeverityColor(item.severity)}>{item.severity.toUpperCase()}</Tag>
                        <Tag>{item.category === 'completeness' ? '完整性' : '规范性'}</Tag>
                        <Tag color="red">-{item.score_deduction}分</Tag>
                        <Tag>{item.file}</Tag>
                      </Space>
                    }
                    description={
                        <div style={{ marginTop: '12px' }}>
                            <Alert
                                message="改进建议"
                                description={item.suggestion}
                                type="info"
                                showIcon
                                style={{ marginBottom: '12px' }}
                            />
                            {item.line_number && (
                                <Text type="secondary">位置：第 {item.line_number} 行</Text>
                            )}
                        </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;