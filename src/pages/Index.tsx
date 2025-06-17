
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 이미 로그인된 사용자가 있는지 확인
    const userType = localStorage.getItem('userType');
    if (userType === 'admin') {
      navigate('/admin');
    } else if (userType === 'student') {
      navigate('/student');
    }
    // 로그인되지 않은 경우 Login 페이지는 이미 기본 경로(/)에 있음
  }, [navigate]);

  return null;
};

export default Index;
